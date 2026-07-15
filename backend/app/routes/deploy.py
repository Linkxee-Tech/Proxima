from fastapi import APIRouter, Depends
from ..core.security import current_user
from ..schemas import GoalRequest
from .workflows import create, get_workflow, cancel, rerun

router = APIRouter(prefix="/deploy", tags=["deploy"])
@router.post("", status_code=201)
def deploy(payload: GoalRequest, user: dict = Depends(current_user)) -> dict: return create(payload, user)
@router.get("/{dag_id}")
def get_deploy(dag_id: str, user: dict = Depends(current_user)) -> dict: return get_workflow(dag_id, user)
@router.delete("/{dag_id}")
def delete_deploy(dag_id: str, user: dict = Depends(current_user)) -> dict: return cancel(dag_id, user)
@router.post("/{dag_id}/retry", status_code=201)
def retry_deploy(dag_id: str, user: dict = Depends(current_user)) -> dict: return rerun(dag_id, user)
