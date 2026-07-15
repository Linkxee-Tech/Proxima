from fastapi import APIRouter, Depends
from ..core.security import current_user
from .tools import list_tools, connect as tool_connect, disconnect as tool_disconnect

router = APIRouter(prefix="/integrations", tags=["integrations"])
PLATFORMS = ["gmail", "calendar", "slack", "notion", "twitter", "linkedin", "facebook", "whatsapp"]

@router.get("")
def status(user: dict = Depends(current_user)) -> dict:
    return list_tools(user)

@router.post("/{platform}/connect")
def connect(platform: str, user: dict = Depends(current_user)) -> dict:
    return tool_connect(platform, user)

@router.delete("/{platform}")
def disconnect(platform: str, user: dict = Depends(current_user)) -> dict:
    return tool_disconnect(platform, user)
