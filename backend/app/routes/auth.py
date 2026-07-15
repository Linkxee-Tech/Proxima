from datetime import datetime, timezone
from collections import defaultdict, deque
from time import time
from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..core.store import store
from ..core.security import current_user, issue_token, issue_refresh_token, decode_token
from ..schemas import Credentials

router = APIRouter(prefix="/auth", tags=["auth"])
passwords = CryptContext(schemes=["bcrypt"], deprecated="auto")
attempts: dict[str, deque[float]] = defaultdict(deque)

def tokens(user: dict) -> dict:
    return {"token": issue_token(user["id"], user["email"]), "refreshToken": issue_refresh_token(user["id"], user["email"]), "user": {"id": user["id"], "email": user["email"]}}

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
def register(payload: Credentials) -> dict:
    with store.lock:
        if any(user["email"] == payload.email for user in store.data["users"]):
            raise HTTPException(status_code=409, detail="An account already exists for this email.")
        user = {"id": store.id(), "email": payload.email, "passwordHash": passwords.hash(payload.password), "createdAt": datetime.now(timezone.utc).isoformat()}
        store.data["users"].append(user); store.save()
    audit(user["id"], "registered")
    return tokens(user)

@router.post("/login")
def login(payload: Credentials) -> dict:
    allow(payload.email)
    user = next((item for item in store.data["users"] if item["email"] == payload.email), None)
    if not user or not passwords.verify(payload.password, user["passwordHash"]):
        audit(user["id"] if user else None, "login_failed")
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    audit(user["id"], "logged_in")
    return tokens(user)

class RefreshRequest(BaseModel):
    refreshToken: str

@router.post("/refresh")
def refresh(payload: RefreshRequest) -> dict:
    try: claims = decode_token(payload.refreshToken)
    except ValueError as error: raise HTTPException(status_code=401, detail="Invalid refresh token.") from error
    if claims.get("type") != "refresh" or claims.get("jti") in store.data.setdefault("revokedTokens", []): raise HTTPException(status_code=401, detail="Invalid refresh token.")
    user = next((item for item in store.data["users"] if item["id"] == claims["sub"]), None)
    if not user: raise HTTPException(status_code=401, detail="User not found.")
    with store.lock:
        store.data["revokedTokens"].append(claims["jti"]); store.save()
    return tokens(user)

@router.post("/logout")
def logout(payload: RefreshRequest) -> dict:
    try: claims = decode_token(payload.refreshToken)
    except ValueError: return {"ok": True}
    if claims.get("jti"):
        with store.lock:
            store.data.setdefault("revokedTokens", []).append(claims["jti"]); store.save()
    audit(claims.get("sub"), "logged_out")
    return {"ok": True}

@router.get("/me")
def me(user: dict = Depends(current_user)) -> dict:
    return {"user": user}
