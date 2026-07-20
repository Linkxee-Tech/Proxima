from fastapi import APIRouter, Depends
from ..core.security import current_user
from ..schemas import GoalRequest
from .workflows import create, get_workflow, cancel, rerun

router = APIRouter(prefix="/deploy", tags=["deploy"])
@router.post("", status_code=201)
async def deploy(payload: GoalRequest, user: dict = Depends(current_user)) -> dict: return await create(payload, user)
@router.get("/{dag_id}")
def get_deploy(dag_id: str, user: dict = Depends(current_user)) -> dict: return get_workflow(dag_id, user)
@router.delete("/{dag_id}")
async def delete_deploy(dag_id: str, user: dict = Depends(current_user)) -> dict: return await cancel(dag_id, user)
@router.post("/{dag_id}/retry", status_code=201)
async def retry_deploy(dag_id: str, user: dict = Depends(current_user)) -> dict: return await rerun(dag_id, user)
