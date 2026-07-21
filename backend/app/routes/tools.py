import base64
import hashlib
import secrets
import time
from urllib.parse import urlencode
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from ..core.crypto import encrypt
from ..core.crypto import decrypt
from ..core.config import settings
from ..core.security import current_user
from ..core.store import store
from ..tools.registry import TOOLS, authorization_url, credential, definition

router = APIRouter(prefix="/tools", tags=["tools"])

class CallbackPayload(BaseModel):
    code: str = Field(min_length=1)
    state: str = Field(min_length=1)

class ExecutePayload(BaseModel):
    action: str
    parameters: dict = Field(default_factory=dict)


class SlackMessagePayload(BaseModel):
    channel: str = Field(min_length=2, max_length=80)
    text: str = Field(min_length=1, max_length=40000)


class SlackNotificationChannelPayload(BaseModel):
    channel: str = Field(min_length=2, max_length=80)

def connections(user_id: str) -> list[dict]:
    return [item for item in store.data.setdefault("connections", []) if item["userId"] == user_id]


async def send_workflow_update(user_id: str, text: str) -> bool:
    """Post an opted-in workflow update without letting Slack failures stop the work."""
    connection = next((item for item in connections(user_id) if item["tool"] == "slack"), None)
    channel = connection.get("notificationChannel") if connection else None
    if not connection or not channel:
        return False
    try:
        token = decrypt(connection["accessToken"])
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {token}"},
                json={"channel": channel, "text": text},
            )
        result = response.json()
        status = "sent" if response.is_success and result.get("ok") else "failed"
    except (httpx.HTTPError, ValueError):
        result = {}
        status = "failed"
    with store.lock:
        store.data["audit"].append({"id": store.id(), "userId": user_id, "tool": "slack", "action": "workflow_update", "at": time.time(), "status": status, "channel": channel, "messageTs": result.get("ts")})
        store.save()
    return status == "sent"

@router.get("")
def list_tools(user: dict = Depends(current_user)) -> dict:
    linked = {item["tool"]: item for item in connections(user["id"])}
    return {"items": [{"name": tool.name, "label": tool.label, "connected": name in linked, "configured": tool.configured(), "connectionRequired": tool.oauth, "scopes": list(tool.scopes), "expiresAt": linked.get(name, {}).get("expiresAt")} for name, tool in TOOLS.items()]}

@router.post("/{tool_name}/connect")
def connect(tool_name: str, user: dict = Depends(current_user)) -> dict:
    tool = definition(tool_name)
    if not tool.oauth:
        raise HTTPException(status_code=409, detail=f"{tool.label} uses server-side credentials and does not have an OAuth connect flow.")
    if not tool.configured():
        raise HTTPException(status_code=503, detail=f"{tool.label} OAuth is not configured. Set {tool.client_id_env} and the provider callback URL first.")
    state = secrets.token_urlsafe(32); verifier = secrets.token_urlsafe(64) if tool.pkce else None
    with store.lock:
        pending = store.data.setdefault("oauthStates", [])
        pending.append({"state": state, "tool": tool_name, "userId": user["id"], "verifier": verifier, "expiresAt": time.time() + 600})
        store.save()
    return {"authorizationUrl": authorization_url(tool, state, verifier), "state": state}

async def exchange(tool_name: str, code: str, state: str) -> None:
    pending = next((item for item in store.data.setdefault("oauthStates", []) if secrets.compare_digest(item["state"], state) and item["tool"] == tool_name and item["expiresAt"] > time.time()), None)
    if not pending: raise HTTPException(status_code=400, detail="OAuth state is invalid or expired.")
    tool = definition(tool_name)
    body = {"grant_type": "authorization_code", "code": code, "redirect_uri": f"{settings.proxima_public_api_url}/api/v1/tools/{tool_name}/callback"}
    headers: dict[str, str] = {"Accept": "application/json"}
    if tool.pkce: body.update({"client_id": credential(tool.client_id_env), "code_verifier": pending["verifier"]})
    elif tool_name == "notion": headers["Authorization"] = "Basic " + base64.b64encode(f"{credential(tool.client_id_env)}:{credential(tool.client_secret_env)}".encode()).decode()
    else: body.update({"client_id": credential(tool.client_id_env), "client_secret": credential(tool.client_secret_env)})
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(tool.token_url, data=body, headers=headers); response.raise_for_status(); token = response.json()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Provider token exchange failed.") from error
    record = {"id": store.id(), "userId": pending["userId"], "tool":tool_name, "accessToken":encrypt(token["access_token"]), "refreshToken":encrypt(token["refresh_token"]) if token.get("refresh_token") else None, "expiresAt":token.get("expires_in"), "scopes":token.get("scope", " ".join(tool.scopes)).split(), "connectedAt":time.time()}
    with store.lock:
        store.data["oauthStates"].remove(pending); store.data.setdefault("connections", [])[:] = [item for item in store.data["connections"] if not (item["userId"] == record["userId"] and item["tool"] == tool_name)]; store.data["connections"].append(record); store.save()

@router.get("/{tool_name}/callback")
async def callback_redirect(tool_name: str, code: str, state: str) -> RedirectResponse:
    await exchange(tool_name, code, state)
    return RedirectResponse(settings.proxima_frontend_callback_url + "?connected=" + tool_name, status_code=303)

@router.post("/{tool_name}/callback")
async def callback(tool_name: str, payload: CallbackPayload) -> dict:
    await exchange(tool_name, payload.code, payload.state)
    return {"ok": True, "tool": tool_name}

@router.delete("/{tool_name}/disconnect")
def disconnect(tool_name: str, user: dict = Depends(current_user)) -> dict:
    definition(tool_name)
    with store.lock:
        before = len(store.data.setdefault("connections", [])); store.data["connections"][:] = [item for item in store.data["connections"] if not (item["userId"] == user["id"] and item["tool"] == tool_name)]; store.save()
    return {"ok": True, "disconnected": before != len(store.data["connections"])}


@router.post("/slack/notification-channel")
def set_slack_notification_channel(payload: SlackNotificationChannelPayload, user: dict = Depends(current_user)) -> dict:
    connection = next((item for item in connections(user["id"]) if item["tool"] == "slack"), None)
    if not connection:
        raise HTTPException(status_code=409, detail="Connect Slack before saving a workflow updates channel.")
    connection["notificationChannel"] = payload.channel.strip()
    with store.lock:
        store.save()
    return {"ok": True, "channel": connection["notificationChannel"]}


@router.post("/slack/messages", status_code=201)
async def send_slack_message(payload: SlackMessagePayload, user: dict = Depends(current_user)) -> dict:
    """Send a user-authored message through the user's connected Slack bot."""
    connection = next((item for item in connections(user["id"]) if item["tool"] == "slack"), None)
    if not connection:
        raise HTTPException(status_code=409, detail="Connect Slack before sending a message.")
    try:
        token = decrypt(connection["accessToken"])
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {token}"},
                json={"channel": payload.channel.strip(), "text": payload.text.strip()},
            )
        result = response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(status_code=502, detail="Slack could not be reached. Try again shortly.") from error
    if not response.is_success or not result.get("ok"):
        raise HTTPException(status_code=502, detail=f"Slack rejected the message: {result.get('error', 'unknown_error')}.")
    entry = {"id": store.id(), "userId": user["id"], "tool": "slack", "action": "chat.postMessage", "at": time.time(), "status": "sent", "channel": result.get("channel"), "messageTs": result.get("ts")}
    with store.lock:
        store.data["audit"].append(entry)
        store.save()
    return {"ok": True, "channel": result.get("channel"), "messageTs": result.get("ts")}

@router.post("/{tool_name}/execute")
def execute(tool_name: str, payload: ExecutePayload, user: dict = Depends(current_user)) -> dict:
    tool = definition(tool_name)
    if not any(item["tool"] == tool_name for item in connections(user["id"])): raise HTTPException(status_code=409, detail=f"Connect {tool.label} before executing it.")
    entry = {"id":store.id(), "userId":user["id"], "tool":tool_name, "action":payload.action, "at":time.time(), "status":"queued"}
    with store.lock: store.data["audit"].append(entry); store.save()
    return {"jobId":entry["id"], "status":"queued", "tool":tool_name, "action":payload.action}
