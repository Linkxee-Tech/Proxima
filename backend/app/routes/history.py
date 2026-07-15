import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Response
from ..core.security import current_user
from ..core.store import store
from .workflows import owned, rerun

router = APIRouter(prefix="/history", tags=["history"])

@router.get("")
def history(status: str | None = None, offset: int = 0, limit: int = 50, user: dict = Depends(current_user)) -> dict:
    items = [item for item in store.data["workflows"] if item["userId"] == user["id"] and (not status or item["status"] == status)]
    return {"items":items[offset:offset + min(limit, 100)], "total":len(items)}

@router.get("/export")
def export_history(user: dict = Depends(current_user)) -> Response:
    output = io.StringIO(); writer = csv.writer(output); writer.writerow(["id", "goal", "status", "created_at", "updated_at"])
    for item in store.data["workflows"]:
        if item["userId"] == user["id"]: writer.writerow([item["id"], item["goalText"], item["status"], item["createdAt"], item.get("updatedAt", "")])
    return Response(output.getvalue(), media_type="text/csv", headers={"Content-Disposition":"attachment; filename=proxima-history.csv"})

@router.get("/{workflow_id}")
def get_history(workflow_id: str, user: dict = Depends(current_user)) -> dict: return owned(workflow_id, user["id"])

@router.post("/{workflow_id}/rerun", status_code=201)
def rerun_history(workflow_id: str, user: dict = Depends(current_user)) -> dict: return rerun(workflow_id, user)
