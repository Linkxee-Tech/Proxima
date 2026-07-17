from datetime import datetime, timezone
from collections import defaultdict, deque
from time import time
import hashlib
import secrets
from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from ..core.store import store
from ..core.config import settings
from ..core.security import current_user, issue_token, issue_refresh_token, decode_token
from ..schemas import Credentials, PasswordResetRequest, PasswordResetConfirm

router = APIRouter(prefix="/auth", tags=["auth"])
passwords = CryptContext(schemes=["bcrypt"], deprecated="auto")
attempts: dict[str, deque[float]] = defaultdict(deque)

def tokens(user: dict) -> dict:
    return {"token": issue_token(user["id"], user["email"]), "refreshToken": issue_refresh_token(user["id"], user["email"]), "user": {"id": user["id"], "email": user["email"]}}

def set_auth_cookies(response: Response, payload: dict) -> None:
    """Keep the JSON response backwards-compatible while making browser auth HttpOnly."""
    secure = settings.proxima_public_api_url.startswith("https://")
    response.set_cookie("proxima_access_token", payload["token"], httponly=True, secure=secure, samesite="lax", max_age=settings.jwt_access_token_expire_minutes * 60, path="/")
    response.set_cookie("proxima_refresh_token", payload["refreshToken"], httponly=True, secure=secure, samesite="lax", max_age=settings.jwt_refresh_token_expire_days * 86400, path="/api")

def audit(user_id: str | None, event: str) -> None:
    with store.lock:
        store.data["audit"].append({"id":store.id(), "userId":user_id, "event":event, "at":datetime.now(timezone.utc).isoformat()})
        store.save()

def allow(email: str) -> None:
    now = time(); bucket = attempts[email]
    while bucket and bucket[0] < now - 60: bucket.popleft()
    if len(bucket) >= 5: raise HTTPException(status_code=429, detail="Too many login attempts. Try again in a minute.")
    bucket.append(now)

@router.post("/register", status_code=201)
def register(payload: Credentials, response: Response) -> dict:
    with store.lock:
        if any(user["email"] == payload.email for user in store.data["users"]):
            raise HTTPException(status_code=409, detail="An account already exists for this email.")
        user = {"id": store.id(), "email": payload.email, "passwordHash": passwords.hash(payload.password), "createdAt": datetime.now(timezone.utc).isoformat()}
        store.data["users"].append(user); store.save()
    audit(user["id"], "registered")
    result = tokens(user); set_auth_cookies(response, result); return result

@router.post("/login")
def login(payload: Credentials, response: Response) -> dict:
    allow(payload.email)
    user = next((item for item in store.data["users"] if item["email"] == payload.email), None)
    if not user or not passwords.verify(payload.password, user["passwordHash"]):
        audit(user["id"] if user else None, "login_failed")
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    audit(user["id"], "logged_in")
    result = tokens(user); set_auth_cookies(response, result); return result

class RefreshRequest(BaseModel):
    refreshToken: str

@router.post("/refresh")
def refresh(payload: RefreshRequest, response: Response) -> dict:
    try: claims = decode_token(payload.refreshToken)
    except ValueError as error: raise HTTPException(status_code=401, detail="Invalid refresh token.") from error
    if claims.get("type") != "refresh" or claims.get("jti") in store.data.setdefault("revokedTokens", []): raise HTTPException(status_code=401, detail="Invalid refresh token.")
    user = next((item for item in store.data["users"] if item["id"] == claims["sub"]), None)
    if not user: raise HTTPException(status_code=401, detail="User not found.")
    with store.lock:
        store.data["revokedTokens"].append(claims["jti"]); store.save()
    result = tokens(user); set_auth_cookies(response, result); return result

@router.post("/logout")
def logout(payload: RefreshRequest, response: Response) -> dict:
    try: claims = decode_token(payload.refreshToken)
    except ValueError: return {"ok": True}
    if claims.get("jti"):
        with store.lock:
            store.data.setdefault("revokedTokens", []).append(claims["jti"]); store.save()
    response.delete_cookie("proxima_access_token", path="/"); response.delete_cookie("proxima_refresh_token", path="/api")
    audit(claims.get("sub"), "logged_out")
    return {"ok": True}

@router.get("/me")
def me(user: dict = Depends(current_user)) -> dict:
    return {"user": user}


@router.post("/forgot-password")
def forgot_password(payload: PasswordResetRequest) -> dict:
    """Create a one-time reset token without revealing whether an address exists."""
    user = next((item for item in store.data["users"] if item["email"] == payload.email), None)
    result = {"ok": True, "message": "If an account exists for that email, reset instructions have been issued."}
    if not user:
        return result
    raw_token = secrets.token_urlsafe(32)
    record = {"id": store.id(), "userId": user["id"], "tokenHash": hashlib.sha256(raw_token.encode()).hexdigest(), "expiresAt": time() + settings.proxima_password_reset_token_ttl_minutes * 60, "used": False}
    with store.lock:
        store.data.setdefault("passwordResetTokens", [])[:] = [item for item in store.data.setdefault("passwordResetTokens", []) if item.get("userId") != user["id"] and item.get("expiresAt", 0) > time()]
        store.data["passwordResetTokens"].append(record); store.save()
    audit(user["id"], "password_reset_requested")
    if settings.proxima_expose_reset_token:
        result["resetToken"] = raw_token
    return result


@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirm, response: Response) -> dict:
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
    record = next((item for item in store.data.setdefault("passwordResetTokens", []) if secrets.compare_digest(item.get("tokenHash", ""), token_hash) and not item.get("used") and item.get("expiresAt", 0) > time()), None)
    if not record:
        raise HTTPException(status_code=400, detail="This password reset link is invalid or expired.")
    user = next((item for item in store.data["users"] if item["id"] == record["userId"]), None)
    if not user:
        raise HTTPException(status_code=400, detail="This password reset link is invalid or expired.")
    user["passwordHash"] = passwords.hash(payload.password); user["passwordUpdatedAt"] = datetime.now(timezone.utc).isoformat(); record["used"] = True
    with store.lock: store.save()
    audit(user["id"], "password_reset_completed")
    result = tokens(user); set_auth_cookies(response, result); return result
