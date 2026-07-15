from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..core.security import current_user
from ..core.store import store
from .workflows import approve_gate, owned

router = APIRouter(prefix="/approvals", tags=["approvals"])

class BatchRequest(BaseModel):
    approval_ids: list[str]
    action: str

def parse(approval_id: str, user_id: str) -> tuple[dict, dict]:
    try: workflow_id, gate_id = approval_id.split(":", 1)
    except ValueError as error: raise HTTPException(status_code=422, detail="Invalid approval ID.") from error
    workflow = owned(workflow_id, user_id); gate = next((item for item in workflow["tasks"] if item["id"] == gate_id and item.get("isApprovalGate")), None)
    if not gate: raise HTTPException(status_code=404, detail="Approval not found.")
    return workflow, gate

@router.get("")
def list_approvals(status: str = "pending", offset: int = 0, limit: int = 50, user: dict = Depends(current_user)) -> dict:
    items = []
    for workflow in store.data["workflows"]:
        if workflow["userId"] != user["id"]: continue
        for gate in workflow.get("tasks", []):
            if not gate.get("isApprovalGate"): continue
            normalized = "pending" if gate["status"] == "waiting_approval" else "approved" if gate["status"] == "done" else gate["status"]
            if status != "all" and normalized != status: continue
            items.append({"id":f"{workflow['id']}:{gate['id']}", "workflowId":workflow["id"], "task":gate["title"], "status":normalized, "goalText":workflow["goalText"], "createdAt":workflow["createdAt"]})
    return {"items":items[offset:offset + min(limit, 100)], "total":len(items)}

@router.post("/{approval_id}/approve")
def approve(approval_id: str, user: dict = Depends(current_user)) -> dict:
    workflow, gate = parse(approval_id, user["id"])
    approve_gate(workflow, gate["id"])
    store.save()
    return workflow

@router.post("/{approval_id}/reject")
def reject(approval_id: str, user: dict = Depends(current_user)) -> dict:
    workflow, gate = parse(approval_id, user["id"]); gate["status"] = "rejected"; workflow["status"] = "cancelled"; store.save(); return workflow

@router.post("/{approval_id}/defer")
def defer(approval_id: str, user: dict = Depends(current_user)) -> dict:
    workflow, gate = parse(approval_id, user["id"])
    if gate["status"] != "waiting_approval":
        raise HTTPException(status_code=409, detail="Approval has already been resolved.")
    gate["status"] = "deferred"
    gate["deferredAt"] = datetime.now(timezone.utc).isoformat()
    workflow["updatedAt"] = gate["deferredAt"]
    store.save()
    return {"id": approval_id, "status": "deferred", "workflow": workflow["id"]}

@router.post("/batch")
def batch(payload: BatchRequest, user: dict = Depends(current_user)) -> dict:
    if payload.action not in {"approve", "reject"}: raise HTTPException(status_code=422, detail="action must be approve or reject")
    results = [approve(item, user) if payload.action == "approve" else reject(item, user) for item in payload.approval_ids]
    return {"items":results}
