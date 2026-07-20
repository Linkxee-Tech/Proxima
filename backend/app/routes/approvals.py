from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..core.realtime import realtime
from ..core.security import current_user
from ..core.store import store
from .workflows import approve_gate, audit, owned

router = APIRouter(prefix="/approvals", tags=["approvals"])


class BatchRequest(BaseModel):
    approval_ids: list[str] = Field(min_length=1, max_length=100)
    action: Literal["approve", "reject"]


def parse(approval_id: str, user_id: str) -> tuple[dict, dict]:
    try:
        workflow_id, gate_id = approval_id.split(":", 1)
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Invalid approval ID.") from error
    workflow = owned(workflow_id, user_id)
    gate = next((item for item in workflow["tasks"] if item["id"] == gate_id and item.get("isApprovalGate")), None)
    if not gate:
        raise HTTPException(status_code=404, detail="Approval not found.")
    return workflow, gate


async def notify(workflow: dict) -> None:
    with store.lock:
        store.save()
    await realtime.workflow_updated(workflow)


@router.get("")
def list_approvals(status: str = "pending", offset: int = 0, limit: int = 50, user: dict = Depends(current_user)) -> dict:
    items = []
    for workflow in store.data["workflows"]:
        if workflow["userId"] != user["id"]:
            continue
        for gate in workflow.get("tasks", []):
            if not gate.get("isApprovalGate"):
                continue
            normalized = "pending" if gate["status"] == "waiting_approval" else "approved" if gate["status"] == "done" else gate["status"]
            if status != "all" and normalized != status:
                continue
            items.append(
                {
                    "id": f"{workflow['id']}:{gate['id']}",
                    "workflowId": workflow["id"],
                    "task": gate["title"],
                    "status": normalized,
                    "goalText": workflow["goalText"],
                    "createdAt": workflow["createdAt"],
                }
            )
    return {"items": items[offset : offset + min(limit, 100)], "total": len(items)}


@router.post("/{approval_id}/approve")
async def approve(approval_id: str, user: dict = Depends(current_user)) -> dict:
    workflow, gate = parse(approval_id, user["id"])
    approve_gate(workflow, gate["id"])
    workflow["auditTrail"].insert(0, audit(f"Approved: {gate['title']}."))
    await notify(workflow)
    return workflow


@router.post("/{approval_id}/reject")
async def reject(approval_id: str, user: dict = Depends(current_user)) -> dict:
    workflow, gate = parse(approval_id, user["id"])
    if gate["status"] != "waiting_approval":
        raise HTTPException(status_code=409, detail="Approval has already been resolved.")
    gate["status"] = "rejected"
    workflow["status"] = "cancelled"
    workflow["updatedAt"] = datetime.now(timezone.utc).isoformat()
    workflow["auditTrail"].insert(0, audit(f"Rejected: {gate['title']}.", "warning"))
    await notify(workflow)
    return workflow


@router.post("/{approval_id}/defer")
async def defer(approval_id: str, user: dict = Depends(current_user)) -> dict:
    workflow, gate = parse(approval_id, user["id"])
    if gate["status"] != "waiting_approval":
        raise HTTPException(status_code=409, detail="Approval has already been resolved.")
    gate["status"] = "deferred"
    gate["deferredAt"] = datetime.now(timezone.utc).isoformat()
    workflow["status"] = "deferred"
    workflow["updatedAt"] = gate["deferredAt"]
    workflow["auditTrail"].insert(0, audit(f"Decision deferred: {gate['title']}."))
    await notify(workflow)
    return {"id": approval_id, "status": "deferred", "workflow": workflow["id"]}


@router.post("/{approval_id}/resume")
async def resume(approval_id: str, user: dict = Depends(current_user)) -> dict:
    workflow, gate = parse(approval_id, user["id"])
    if gate["status"] != "deferred":
        raise HTTPException(status_code=409, detail="Only deferred approvals can be resumed.")
    gate["status"] = "waiting_approval"
    gate.pop("deferredAt", None)
    workflow["status"] = "waiting_approval"
    workflow["updatedAt"] = datetime.now(timezone.utc).isoformat()
    workflow["auditTrail"].insert(0, audit(f"Decision reopened: {gate['title']}."))
    await notify(workflow)
    return workflow


@router.post("/batch")
async def batch(payload: BatchRequest, user: dict = Depends(current_user)) -> dict:
    if len(set(payload.approval_ids)) != len(payload.approval_ids):
        raise HTTPException(status_code=422, detail="Each approval ID must be unique.")
    # Validate ownership and current state before making any change.
    for approval_id in payload.approval_ids:
        workflow, gate = parse(approval_id, user["id"])
        if gate["status"] != "waiting_approval":
            raise HTTPException(status_code=409, detail=f"Approval is not pending: {workflow['goalText']}.")
    action = approve if payload.action == "approve" else reject
    results = [await action(approval_id, user) for approval_id in payload.approval_ids]
    return {"items": results}
