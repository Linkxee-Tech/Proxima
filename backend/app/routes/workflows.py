from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response
from ..core.store import store
from ..core.security import current_user
from ..schemas import GoalRequest, ApprovalRequest

router = APIRouter(tags=["workflows"])
SOCIAL = ["twitter", "linkedin", "facebook", "whatsapp"]

def now() -> str: return datetime.now(timezone.utc).isoformat()


def artifact(title: str, content: str) -> dict:
    return {"id": store.id(), "title": title, "type": "text", "extension": "txt", "content": content}
def owned(workflow_id: str, user_id: str) -> dict:
    workflow = next((item for item in store.data["workflows"] if item["id"] == workflow_id and item["userId"] == user_id), None)
    if not workflow: raise HTTPException(status_code=404, detail="Workflow not found.")
    return workflow
def social_drafts(goal: str) -> dict:
    return {"twitter": f"We're launching Proxima v2. {goal}", "linkedin": f"We’re excited to announce Proxima v2. {goal}", "facebook": f"Proxima v2 is here. {goal}", "whatsapp": f"Hi everyone — Proxima v2 is live! {goal}"}
def suggested_tasks(goal: str, social: bool = False) -> list[dict]:
    """Return plain-language preview steps before a workflow is created."""
    if social:
        titles = ["Clarify the campaign message", "Create a tailored draft for each channel", "Wait for your publishing approval"]
    else:
        text = goal.lower()
        if any(word in text for word in ("research", "competitor", "compare", "analysis")):
            titles = ["Set the research focus", "Review credible competitor information", "Create a clear comparison report"]
        elif any(word in text for word in ("email", "gmail", "message")):
            titles = ["Draft the message in your voice", "Check the recipient and key details", "Prepare it for your review"]
        elif any(word in text for word in ("meeting", "calendar", "schedule", "slot")):
            titles = ["Identify the meeting details", "Find a suitable time", "Prepare the calendar invitation"]
        elif any(word in text for word in ("brief", "draft", "write", "document")):
            titles = ["Shape the outline", "Draft the first version", "Prepare it for your review"]
        else:
            titles = ["Understand the outcome you want", "Prepare the work in clear stages", "Share the result for your review"]
    return [{"id": f"preview-{index + 1}", "title": title, "kind": "preview"} for index, title in enumerate(titles)]

def approve_gate(workflow: dict, gate_id: str) -> dict:
    """Resolve one approval gate and advance only its dependent social task."""
    gate = next((task for task in workflow["tasks"] if task["id"] == gate_id and task.get("isApprovalGate")), None)
    if not gate:
        raise HTTPException(status_code=404, detail="Approval not found.")
    if gate["status"] != "waiting_approval":
        raise HTTPException(status_code=409, detail="Approval has already been resolved.")
    gate["status"] = "done"
    platform = gate_id.removeprefix("approval-")
    task = next((item for item in workflow["tasks"] if item["id"] == platform and item["kind"] == "social"), None)
    if task and task["status"] == "pending":
        task["status"] = "done"
    workflow["status"] = "completed" if not any(
        item.get("isApprovalGate") and item["status"] == "waiting_approval" for item in workflow["tasks"]
    ) else "waiting_approval"
    workflow["updatedAt"] = now()
    return workflow

def social_workflow(goal: str, user_id: str) -> dict:
    identifier = store.id(); drafts = social_drafts(goal); tasks = [{"id":"intent-parse","title":"Intent Parse","kind":"analysis","status":"done","dependsOn":[]},{"id":"draft-core-message","title":"Draft Core Message","kind":"generation","status":"done","dependsOn":["intent-parse"]},{"id":"tailor-per-platform","title":"Tailor per Platform","kind":"generation","status":"done","dependsOn":["draft-core-message"]}]
    for platform in SOCIAL:
        tasks += [{"id":f"approval-{platform}","title":f"Approve: {platform.title()}","kind":"approval","isApprovalGate":True,"status":"waiting_approval","dependsOn":["tailor-per-platform"]},{"id":platform,"title":"Twitter / X" if platform == "twitter" else platform.title(),"kind":"social","status":"pending","dependsOn":[f"approval-{platform}"]}]
    campaign = "\n\n".join(f"{platform.title()}:\n{text}" for platform, text in drafts.items())
    return {"id":identifier,"userId":user_id,"goalText":goal,"parsed":{"action":"multi_platform_social_publish","summary":"Tailored social publishing awaits approval."},"tasks":tasks,"steps":tasks,"socialDrafts":drafts,"status":"waiting_approval","artifacts":[artifact("Social campaign drafts", campaign)],"auditTrail":[{"id":store.id(),"at":now(),"level":"info","message":"Social drafts generated; approval required."}],"createdAt":now(),"updatedAt":now()}

@router.post("/workflows", status_code=201)
def create(payload: GoalRequest, user: dict = Depends(current_user)) -> dict:
    workflow = social_workflow(payload.goalText, user["id"]) if any(word in payload.goalText.lower() for word in ["social", "twitter", "linkedin", "facebook", "whatsapp"]) else {"id":store.id(),"userId":user["id"],"goalText":payload.goalText,"parsed":{"action":"automation","summary":payload.goalText},"tasks":[],"steps":[],"status":"completed","artifacts":[artifact("Workflow summary", payload.goalText)],"auditTrail":[],"createdAt":now(),"updatedAt":now()}
    with store.lock: store.data["workflows"].insert(0, workflow); store.save()
    return workflow

@router.get("/workflows")
def list_workflows(user: dict = Depends(current_user)) -> dict:
    return {"items":[item for item in store.data["workflows"] if item["userId"] == user["id"]]}

@router.get("/workflows/{workflow_id}")
def get_workflow(workflow_id: str, user: dict = Depends(current_user)) -> dict: return owned(workflow_id, user["id"])


@router.get("/workflows/{workflow_id}/artifacts/{artifact_id}/download")
def download_artifact(workflow_id: str, artifact_id: str, user: dict = Depends(current_user)) -> Response:
    workflow = owned(workflow_id, user["id"])
    item = next((artifact for artifact in workflow.get("artifacts", []) if artifact["id"] == artifact_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Artifact not found.")
    filename = f"{item['title'].lower().replace(' ', '-')}.{item.get('extension', 'txt')}"
    return Response(item.get("content", ""), media_type="text/plain; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="{filename}"'})

@router.post("/workflows/{workflow_id}/approve")
def approve(workflow_id: str, payload: ApprovalRequest, user: dict = Depends(current_user)) -> dict:
    workflow = owned(workflow_id, user["id"])
    gates = [task for task in workflow["tasks"] if task.get("isApprovalGate") and task["status"] == "waiting_approval"]
    if not gates:
        raise HTTPException(status_code=409, detail="No pending approvals remain.")
    for gate in gates if payload.all else gates[:1]:
        approve_gate(workflow, gate["id"])
    store.save()
    return workflow

@router.post("/workflows/{workflow_id}/rerun", status_code=201)
def rerun(workflow_id: str, user: dict = Depends(current_user)) -> dict: return create(GoalRequest(goalText=owned(workflow_id, user["id"])["goalText"]), user)

@router.post("/workflows/{workflow_id}/cancel")
def cancel(workflow_id: str, user: dict = Depends(current_user)) -> dict:
    workflow = owned(workflow_id, user["id"])
    for task in workflow["tasks"]:
        if task["status"] in {"pending", "waiting_approval"}: task["status"] = "skipped"
    workflow["status"] = "cancelled"; workflow["updatedAt"] = now(); store.save(); return workflow

@router.post("/intent")
def intent(payload: GoalRequest, user: dict = Depends(current_user)) -> dict:
    social = any(word in payload.goalText.lower() for word in ["social", "twitter", "linkedin", "facebook", "whatsapp"])
    return {"action":"multi_platform_social_publish" if social else "automation", "summary":"Tailored social workflow" if social else payload.goalText, "entities":{"channels":",".join(SOCIAL)} if social else {}, "requiresApproval":social, "tasks":suggested_tasks(payload.goalText, social)}

@router.get("/metrics")
def metrics(user: dict = Depends(current_user)) -> dict:
    workflows = [item for item in store.data["workflows"] if item["userId"] == user["id"]]
    return {"total":len(workflows), "running":sum(item["status"] == "running" for item in workflows), "waitingApproval":sum(item["status"] == "waiting_approval" for item in workflows), "completed":sum(item["status"] == "completed" for item in workflows)}

@router.get("/blueprint")
def blueprint() -> dict:
    return {"vision":"Proxima runs approval-first DAG workflows through consented integrations.", "capabilities":["FastAPI", "DAG orchestration", "approval gates", "social drafting", "memory mesh", "realtime events"], "memory":[]}
