from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from openai import APIConnectionError, APIStatusError, APITimeoutError, AsyncOpenAI, AuthenticationError, NotFoundError, RateLimitError

from ..core.config import settings
from ..core.realtime import realtime
from ..core.security import current_user
from ..core.store import store
from ..kernel.intent import parse_goal
from ..schemas import ApprovalRequest, ArtifactUpdateRequest, GoalRequest
from .tools import send_workflow_update

router = APIRouter(tags=["workflows"])
SOCIAL = ["twitter", "linkedin", "facebook", "whatsapp"]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def artifact(title: str, content: str) -> dict:
    return {"id": store.id(), "title": title, "type": "text", "extension": "txt", "content": content}


def owned(workflow_id: str, user_id: str) -> dict:
    workflow = next(
        (item for item in store.data["workflows"] if item["id"] == workflow_id and item["userId"] == user_id),
        None,
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found.")
    return workflow


def social_goal(goal: str) -> bool:
    text = goal.lower()
    return any(word in text for word in ["social", "twitter", "linkedin", "facebook", "whatsapp"])


def external_goal(goal: str) -> bool:
    text = goal.lower()
    return any(
        word in text
        for word in [
            "send ",
            "email",
            "gmail",
            "message",
            "slack",
            "schedule",
            "calendar",
            "meeting",
            "publish",
            "post ",
        ]
    )


def suggested_tasks(goal: str, social: bool = False) -> list[dict]:
    """Return a small, plain-language plan that the interface can explain clearly."""
    if social:
        titles = [
            "Clarify the campaign message",
            "Create a tailored draft for each channel",
            "Wait for your publishing approval",
        ]
    else:
        text = goal.lower()
        if any(word in text for word in ("research", "competitor", "compare", "analysis")):
            titles = [
                "Set the research focus",
                "Review credible competitor information",
                "Create a clear comparison report",
            ]
        elif any(word in text for word in ("email", "gmail", "message", "slack")):
            titles = [
                "Draft the message in your voice",
                "Check the recipient and key details",
                "Prepare it for your review",
            ]
        elif any(word in text for word in ("meeting", "calendar", "schedule", "slot")):
            titles = [
                "Identify the meeting details",
                "Find a suitable time",
                "Prepare the invitation for your review",
            ]
        elif any(word in text for word in ("brief", "draft", "write", "document")):
            titles = [
                "Shape the outline",
                "Draft the first version",
                "Prepare it for your review",
            ]
        else:
            titles = [
                "Understand the outcome you want",
                "Prepare the work in clear stages",
                "Share the result for your review",
            ]
    return [{"id": f"preview-{index + 1}", "title": title, "kind": "preview"} for index, title in enumerate(titles)]


async def goal_intent(goal: str) -> dict:
    """Combine the configured intent service with safe local classifications."""
    parsed = await parse_goal(goal)
    social = social_goal(goal)
    review_required = social or external_goal(goal)
    action = parsed.get("action") or "automation"

    if social:
        mentioned = [platform for platform in SOCIAL if platform in goal.lower()]
        channels = mentioned or SOCIAL
        action = "multi_platform_social_publish"
        entities = {**(parsed.get("entities") or {}), "channels": channels}
    elif any(word in goal.lower() for word in ("research", "competitor", "compare", "analysis")):
        action = "research_brief"
        entities = parsed.get("entities") or {}
    elif any(word in goal.lower() for word in ("brief", "draft", "write", "document")):
        action = "writing_draft"
        entities = parsed.get("entities") or {}
    elif review_required:
        action = "review_required_action"
        entities = parsed.get("entities") or {}
    else:
        entities = parsed.get("entities") or {}

    return {
        "action": action,
        "summary": parsed.get("summary") or goal,
        "entities": entities,
        "requiresApproval": review_required,
        "tasks": suggested_tasks(goal, social),
        "workProduct": parsed.get("workProduct"),
    }


def reviewed_intent(intent: dict, payload: GoalRequest) -> dict:
    """Keep the exact prepared draft the user reviewed before starting work."""
    if not payload.preparedWork:
        return intent
    work = payload.preparedWork
    return {
        **intent,
        "workProduct": {"title": work.title, "type": work.type, "content": work.content},
    }


def audit(message: str, level: str = "info") -> dict:
    return {"id": store.id(), "at": now(), "level": level, "message": message}


async def slack_update(workflow: dict, message: str) -> None:
    if await send_workflow_update(workflow["userId"], message):
        workflow["auditTrail"].insert(0, audit("Sent a workflow update to Slack."))


def plan_artifact(goal: str, intent: dict) -> dict:
    work_product = intent.get("workProduct") or {}
    lines = [
        f"Goal: {goal}",
    ]
    if work_product.get("content"):
        lines.extend(["", work_product.get("title") or "Prepared work", "", work_product["content"]])
    lines.extend(["", "Prepared steps:", *[f"- {task['title']}" for task in intent["tasks"]]])
    if intent["requiresApproval"]:
        lines.extend(["", "No outside account has been changed. Review is required before this work can continue."])
        title = "Prepared work for review"
    else:
        lines.extend(["", "This plan is ready to use. No outside account has been changed."])
        title = "Prepared work plan"
    return artifact(title, "\n".join(lines))


def general_workflow(goal: str, user_id: str, intent: dict, workflow_id: str | None = None) -> dict:
    steps = [
        {
            "id": "understand-goal",
            "title": "Understand the request",
            "kind": "planning",
            "status": "done",
            "dependsOn": [],
        }
    ]
    previous = "understand-goal"
    for index, task in enumerate(intent["tasks"][:3], start=1):
        step_id = f"prepare-{index}"
        steps.append(
            {
                "id": step_id,
                "title": task["title"],
                "kind": "planning",
                "status": "done",
                "dependsOn": [previous],
            }
        )
        previous = step_id

    status = "completed"
    risk = {"level": "low", "reason": "This request only prepares work for you to review.", "affectedTools": [], "rollback": "You can delete the saved work at any time."}
    if intent["requiresApproval"]:
        steps.append(
            {
                "id": "approval-review",
                "title": "Review prepared work",
                "kind": "approval",
                "isApprovalGate": True,
                "status": "waiting_approval",
                "dependsOn": [previous],
            }
        )
        status = "waiting_approval"
        risk = {
            "level": "review",
            "reason": "This request may affect an external service, so your review is required first.",
            "affectedTools": [],
            "rollback": "No outside account has been changed by this workflow.",
        }

    return {
        "id": workflow_id or store.id(),
        "userId": user_id,
        "goalText": goal,
        "parsed": intent,
        "tasks": steps,
        "steps": steps,
        "status": status,
        "risk": risk,
        "artifacts": [plan_artifact(goal, intent)],
        "auditTrail": [
            audit("Goal received and understood."),
            audit("A clear plan was prepared."),
            audit("Waiting for your review before continuing.") if intent["requiresApproval"] else audit("Prepared work is ready to review."),
        ],
        "createdAt": now(),
        "updatedAt": now(),
    }


def social_drafts(goal: str, platforms: list[str]) -> dict:
    base = goal.rstrip(". ")
    drafts = {
        "twitter": f"{base}. More to come.",
        "linkedin": f"We are sharing an update: {base}. Follow along for the next steps.",
        "facebook": f"An update from our team: {base}. We would love to hear what you think.",
        "whatsapp": f"Quick update: {base}. We will share more soon.",
    }
    return {platform: drafts[platform] for platform in platforms}


def social_workflow(goal: str, user_id: str, intent: dict, workflow_id: str | None = None) -> dict:
    channels = intent["entities"]["channels"]
    drafts = social_drafts(goal, channels)
    steps = [
        {"id": "understand-goal", "title": "Understand the campaign", "kind": "planning", "status": "done", "dependsOn": []},
        {"id": "draft-core-message", "title": "Draft the core message", "kind": "writing", "status": "done", "dependsOn": ["understand-goal"]},
        {"id": "tailor-per-platform", "title": "Tailor drafts for each channel", "kind": "writing", "status": "done", "dependsOn": ["draft-core-message"]},
    ]
    for platform in channels:
        steps.append(
            {
                "id": f"approval-{platform}",
                "title": f"Review {platform.title() if platform != 'twitter' else 'Twitter / X'} draft",
                "kind": "approval",
                "isApprovalGate": True,
                "status": "waiting_approval",
                "dependsOn": ["tailor-per-platform"],
            }
        )
        steps.append(
            {
                "id": platform,
                "title": f"{platform.title() if platform != 'twitter' else 'Twitter / X'} draft reviewed",
                "kind": "review",
                "status": "pending",
                "dependsOn": [f"approval-{platform}"],
            }
        )
    campaign = "\n\n".join(f"{platform.title()}:\n{text}" for platform, text in drafts.items())
    return {
        "id": workflow_id or store.id(),
        "userId": user_id,
        "goalText": goal,
        "parsed": intent,
        "tasks": steps,
        "steps": steps,
        "socialDrafts": drafts,
        "status": "waiting_approval",
        "risk": {
            "level": "review",
            "reason": "These drafts are intended for external channels and need your review.",
            "affectedTools": [platform.title() for platform in channels],
            "rollback": "No post has been published by this workflow.",
        },
        "artifacts": [artifact("Social campaign drafts", campaign)],
        "auditTrail": [audit("Campaign goal received."), audit("Channel drafts prepared."), audit("Waiting for your approval.")],
        "createdAt": now(),
        "updatedAt": now(),
    }


def workflow_for(goal: str, user_id: str, intent: dict, workflow_id: str | None = None) -> dict:
    if intent["action"] == "multi_platform_social_publish":
        return social_workflow(goal, user_id, intent, workflow_id)
    return general_workflow(goal, user_id, intent, workflow_id)


def approve_gate(workflow: dict, gate_id: str) -> dict:
    gate = next((task for task in workflow["tasks"] if task["id"] == gate_id and task.get("isApprovalGate")), None)
    if not gate:
        raise HTTPException(status_code=404, detail="Approval not found.")
    if gate["status"] != "waiting_approval":
        raise HTTPException(status_code=409, detail="Approval has already been resolved.")
    gate["status"] = "done"
    platform = gate_id.removeprefix("approval-")
    reviewed_task = next((task for task in workflow["tasks"] if task["id"] == platform and task["status"] == "pending"), None)
    if reviewed_task:
        reviewed_task["status"] = "done"
    waiting = [item for item in workflow["tasks"] if item.get("isApprovalGate") and item["status"] == "waiting_approval"]
    workflow["status"] = "waiting_approval" if waiting else "completed"
    workflow["updatedAt"] = now()
    return workflow


@router.post("/workflows", status_code=201)
async def create(payload: GoalRequest, user: dict = Depends(current_user)) -> dict:
    intent = reviewed_intent(await goal_intent(payload.goalText), payload)
    workflow = workflow_for(payload.goalText, user["id"], intent)
    with store.lock:
        store.data["workflows"].insert(0, workflow)
        store.save()
    await slack_update(workflow, f"Proxima: Started work on “{payload.goalText}”. " + ("It is ready for your review." if workflow["status"] == "waiting_approval" else "The prepared plan is ready."))
    await realtime.workflow_updated(workflow)
    return workflow


@router.post("/workflows/drafts", status_code=201)
async def save_draft(payload: GoalRequest, user: dict = Depends(current_user)) -> dict:
    intent = reviewed_intent(await goal_intent(payload.goalText), payload)
    draft = {
        "id": store.id(),
        "userId": user["id"],
        "goalText": payload.goalText,
        "parsed": intent,
        "tasks": [
            {"id": task["id"], "title": task["title"], "kind": "planning", "status": "draft", "dependsOn": []}
            for task in intent["tasks"]
        ],
        "steps": [],
        "status": "draft",
        "risk": {"level": "none", "reason": "This request is saved and has not started.", "affectedTools": [], "rollback": "Delete the draft when you no longer need it."},
        "artifacts": [],
        "auditTrail": [audit("Draft saved. Work has not started.")],
        "createdAt": now(),
        "updatedAt": now(),
    }
    with store.lock:
        store.data["workflows"].insert(0, draft)
        store.save()
    await realtime.workflow_updated(draft)
    return draft


@router.post("/workflows/{workflow_id}/start")
async def start_draft(workflow_id: str, user: dict = Depends(current_user)) -> dict:
    draft = owned(workflow_id, user["id"])
    if draft["status"] != "draft":
        raise HTTPException(status_code=409, detail="Only saved drafts can be started.")
    workflow = workflow_for(draft["goalText"], user["id"], draft["parsed"], draft["id"])
    workflow["createdAt"] = draft["createdAt"]
    workflow["auditTrail"].insert(0, audit("Saved draft started."))
    with store.lock:
        index = store.data["workflows"].index(draft)
        store.data["workflows"][index] = workflow
        store.save()
    await slack_update(workflow, f"Proxima: Started saved work “{workflow['goalText']}”.")
    await realtime.workflow_updated(workflow)
    return workflow


@router.get("/workflows")
def list_workflows(user: dict = Depends(current_user)) -> dict:
    return {"items": [item for item in store.data["workflows"] if item["userId"] == user["id"]]}


@router.get("/workflows/{workflow_id}")
def get_workflow(workflow_id: str, user: dict = Depends(current_user)) -> dict:
    return owned(workflow_id, user["id"])


@router.get("/workflows/{workflow_id}/artifacts/{artifact_id}/download")
def download_artifact(workflow_id: str, artifact_id: str, user: dict = Depends(current_user)) -> Response:
    workflow = owned(workflow_id, user["id"])
    item = next((artifact_item for artifact_item in workflow.get("artifacts", []) if artifact_item["id"] == artifact_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Artifact not found.")
    filename = f"{item['title'].lower().replace(' ', '-')}.{item.get('extension', 'txt')}"
    return Response(item.get("content", ""), media_type="text/plain; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


def workflow_artifact(workflow_id: str, artifact_id: str, user_id: str) -> tuple[dict, dict]:
    workflow = owned(workflow_id, user_id)
    item = next((artifact_item for artifact_item in workflow.get("artifacts", []) if artifact_item["id"] == artifact_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Artifact not found.")
    return workflow, item


def save_artifact_content(workflow: dict, item: dict, content: str) -> dict:
    item["content"] = content.strip()
    item["updatedAt"] = now()
    work_product = workflow.get("parsed", {}).get("workProduct")
    if work_product and item["title"] in {"Prepared work plan", "Prepared work for review", work_product.get("title")}:
        work_product["content"] = item["content"]
    workflow["updatedAt"] = now()
    workflow["auditTrail"].insert(0, audit(f"Updated: {item['title']}."))
    with store.lock:
        store.save()
    return workflow


@router.patch("/workflows/{workflow_id}/artifacts/{artifact_id}")
async def update_artifact(workflow_id: str, artifact_id: str, payload: ArtifactUpdateRequest, user: dict = Depends(current_user)) -> dict:
    workflow, item = workflow_artifact(workflow_id, artifact_id, user["id"])
    return save_artifact_content(workflow, item, payload.content)


@router.post("/workflows/{workflow_id}/artifacts/{artifact_id}/improve")
async def improve_artifact(workflow_id: str, artifact_id: str, user: dict = Depends(current_user)) -> dict:
    workflow, item = workflow_artifact(workflow_id, artifact_id, user["id"])
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI drafting is not configured. Add OPENAI_API_KEY to improve this work.")
    prompt = (
        "Expand the following prepared office-work document into a comprehensive, ready-to-edit deliverable. "
        "Preserve known facts, clearly label assumptions and missing information, and do not invent market data, prices, "
        "people, dates, or sources. For research, include a comparison framework, source plan, evidence table template, "
        "findings structure, risks, and recommended next actions. Return only the improved document, with clear headings.\n\n"
        f"Goal: {workflow['goalText']}\n\nCurrent document:\n{item.get('content', '')}"
    )
    try:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(
            model=settings.proxima_openai_model,
            messages=[{"role": "system", "content": "You write accurate, useful office deliverables."}, {"role": "user", "content": prompt}],
        )
        content = (response.choices[0].message.content or "").strip()
    except AuthenticationError as error:
        raise HTTPException(status_code=503, detail="OpenAI rejected the configured API key. Update OPENAI_API_KEY and try again.") from error
    except NotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail=f"The configured OpenAI model ({settings.proxima_openai_model}) is unavailable. Set PROXIMA_OPENAI_MODEL to a model available to this API key.",
        ) from error
    except RateLimitError as error:
        raise HTTPException(status_code=429, detail="OpenAI is temporarily rate-limiting draft improvements. Please try again shortly.") from error
    except (APITimeoutError, APIConnectionError) as error:
        raise HTTPException(status_code=503, detail="Proxima could not reach OpenAI. Check the backend connection and try again.") from error
    except APIStatusError as error:
        raise HTTPException(status_code=502, detail="OpenAI could not improve this draft right now. Please try again shortly.") from error
    except Exception as error:
        raise HTTPException(status_code=502, detail="OpenAI returned an unexpected response while improving this draft.") from error
    if not content:
        raise HTTPException(status_code=502, detail="OpenAI returned an empty draft. Try again shortly.")
    return save_artifact_content(workflow, item, content[:20000])


@router.post("/workflows/{workflow_id}/approve")
async def approve(workflow_id: str, payload: ApprovalRequest, user: dict = Depends(current_user)) -> dict:
    workflow = owned(workflow_id, user["id"])
    gates = [task for task in workflow["tasks"] if task.get("isApprovalGate") and task["status"] == "waiting_approval"]
    if not gates:
        raise HTTPException(status_code=409, detail="No pending approvals remain.")
    for gate in gates if payload.all else gates[:1]:
        approve_gate(workflow, gate["id"])
    message = "All drafts were approved and marked complete." if workflow.get("socialDrafts") and workflow["status"] == "completed" else "Approval recorded; workflow advanced."
    workflow["auditTrail"].insert(0, audit(message))
    with store.lock:
        store.save()
    await slack_update(workflow, f"Proxima: {message}")
    await realtime.workflow_updated(workflow)
    return workflow


@router.post("/workflows/{workflow_id}/rerun", status_code=201)
async def rerun(workflow_id: str, user: dict = Depends(current_user)) -> dict:
    return await create(GoalRequest(goalText=owned(workflow_id, user["id"])["goalText"]), user)


@router.post("/workflows/{workflow_id}/cancel")
async def cancel(workflow_id: str, user: dict = Depends(current_user)) -> dict:
    workflow = owned(workflow_id, user["id"])
    for task in workflow.get("tasks", []):
        if task["status"] in {"pending", "waiting_approval", "draft", "deferred"}:
            task["status"] = "skipped"
    workflow["status"] = "cancelled"
    workflow["updatedAt"] = now()
    workflow["auditTrail"].insert(0, audit("Workflow cancelled.", "warning"))
    with store.lock:
        store.save()
    await slack_update(workflow, f"Proxima: Cancelled work “{workflow['goalText']}”.")
    await realtime.workflow_updated(workflow)
    return workflow


@router.post("/intent")
async def intent(payload: GoalRequest, user: dict = Depends(current_user)) -> dict:
    return await goal_intent(payload.goalText)


@router.get("/metrics")
def metrics(user: dict = Depends(current_user)) -> dict:
    workflows = [item for item in store.data["workflows"] if item["userId"] == user["id"]]
    return {
        "total": len(workflows),
        "running": sum(item["status"] == "running" for item in workflows),
        "waitingApproval": sum(item["status"] == "waiting_approval" for item in workflows),
        "completed": sum(item["status"] == "completed" for item in workflows),
    }


@router.get("/blueprint")
def blueprint(user: dict = Depends(current_user)) -> dict:
    memories = [item for item in store.data["memories"] if item["userId"] == user["id"]]
    return {
        "vision": "Proxima prepares work clearly and keeps your decisions in view.",
        "capabilities": ["goal planning", "approval gates", "saved context", "connected apps", "realtime updates"],
        "memory": memories[:5],
    }
