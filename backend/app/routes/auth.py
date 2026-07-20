from datetime import datetime, timezone
from collections import defaultdict, deque
from email.message import EmailMessage
from time import time
import hashlib
import secrets
import smtplib
import ssl
from urllib.parse import urlencode
from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from ..core.store import store
from ..core.config import settings
from ..core.security import current_user, issue_token, issue_refresh_token, decode_token
from ..schemas import Credentials, RegistrationCredentials, PasswordResetRequest, PasswordResetConfirm

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

def normalized_email(email: str) -> str:
    return email.strip().casefold()


def ensure_not_rate_limited(email: str) -> None:
    now = time(); bucket = attempts[email]
    while bucket and bucket[0] < now - 60: bucket.popleft()
    if len(bucket) >= 5: raise HTTPException(status_code=429, detail="Too many login attempts. Try again in a minute.")


def record_failed_attempt(email: str) -> None:
    now = time(); bucket = attempts[email]
    while bucket and bucket[0] < now - 60: bucket.popleft()
    bucket.append(now)


def reset_email_configured() -> bool:
    return bool(settings.proxima_smtp_host and settings.proxima_smtp_from)


def send_reset_email(email: str, raw_token: str) -> None:
    """Send the one-time reset URL without recording the raw token anywhere."""
    reset_url = f"{settings.proxima_public_app_url.rstrip('/')}/reset-password?{urlencode({'token': raw_token})}"
    message = EmailMessage()
    message["Subject"] = "Reset your Proxima password"
    message["From"] = settings.proxima_smtp_from
    message["To"] = email
    message.set_content(
        "We received a request to reset your Proxima password.\n\n"
        f"Use this one-time link within {settings.proxima_password_reset_token_ttl_minutes} minutes:\n{reset_url}\n\n"
        "If you did not request this, you can safely ignore this email."
    )
    client_class = smtplib.SMTP_SSL if settings.proxima_smtp_use_ssl else smtplib.SMTP
    with client_class(settings.proxima_smtp_host, settings.proxima_smtp_port, timeout=15) as client:
        if settings.proxima_smtp_use_tls and not settings.proxima_smtp_use_ssl:
            client.starttls(context=ssl.create_default_context())
        if settings.proxima_smtp_username:
            client.login(settings.proxima_smtp_username, settings.proxima_smtp_password)
        client.send_message(message)

@router.post("/register", status_code=201)
def register(payload: RegistrationCredentials, response: Response) -> dict:
    email = normalized_email(str(payload.email))
    with store.lock:
        if any(normalized_email(user["email"]) == email for user in store.data["users"]):
            raise HTTPException(status_code=409, detail="An account already exists for this email.")
        user = {"id": store.id(), "email": email, "passwordHash": passwords.hash(payload.password), "createdAt": datetime.now(timezone.utc).isoformat()}
        store.data["users"].append(user); store.save()
    audit(user["id"], "registered")
    result = tokens(user); set_auth_cookies(response, result); return result

@router.post("/login")
def login(payload: Credentials, response: Response) -> dict:
    email = normalized_email(str(payload.email))
    ensure_not_rate_limited(email)
    user = next((item for item in store.data["users"] if normalized_email(item["email"]) == email), None)
    if not user or not passwords.verify(payload.password, user["passwordHash"]):
        record_failed_attempt(email)
        audit(user["id"] if user else None, "login_failed")
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    attempts.pop(email, None)
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
    """Email a one-time reset token without exposing whether an address exists."""
    if not settings.proxima_expose_reset_token and not reset_email_configured():
        raise HTTPException(status_code=503, detail="Password-reset email is not configured. Contact the service administrator.")
    email = normalized_email(str(payload.email))
    user = next((item for item in store.data["users"] if normalized_email(item["email"]) == email), None)
    result = {"ok": True, "message": "If an account exists for that email, reset instructions have been sent."}
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
    try:
        send_reset_email(user["email"], raw_token)
    except (OSError, smtplib.SMTPException) as error:
        with store.lock:
            record["used"] = True
            store.save()
        audit(user["id"], "password_reset_delivery_failed")
        raise HTTPException(status_code=502, detail="Unable to send password-reset email. Try again later.") from error
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
