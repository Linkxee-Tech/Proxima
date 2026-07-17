from datetime import datetime, timedelta, timezone
import jwt
from uuid import uuid4
from fastapi import HTTPException, Request, status
from .config import settings


def issue_token(user_id: str, email: str) -> str:
    if not settings.proxima_jwt_secret:
        raise HTTPException(status_code=503, detail="PROXIMA_JWT_SECRET is required for authentication.")
    return jwt.encode({"sub": user_id, "email": email, "type": "access", "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)}, settings.proxima_jwt_secret, algorithm=settings.jwt_algorithm)


def issue_refresh_token(user_id: str, email: str) -> str:
    if not settings.proxima_jwt_secret:
        raise HTTPException(status_code=503, detail="PROXIMA_JWT_SECRET is required for authentication.")
    return jwt.encode({"sub": user_id, "email": email, "type": "refresh", "jti": str(uuid4()), "exp": datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)}, settings.proxima_jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.proxima_jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as error:
        raise ValueError("Invalid token.") from error


def current_user(request: Request) -> dict:
    if not settings.proxima_jwt_secret:
        if settings.proxima_allow_insecure_local_auth:
            return {"id": "local", "email": "local@proxima.dev"}
        raise HTTPException(status_code=503, detail="PROXIMA_JWT_SECRET is required for authenticated API access.")
    token = request.headers.get("authorization", "").removeprefix("Bearer ").strip() or request.cookies.get("proxima_access_token", "")
    try:
        payload = jwt.decode(token, settings.proxima_jwt_secret, algorithms=[settings.jwt_algorithm])
        return {"id": payload["sub"], "email": payload["email"]}
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.") from error


def websocket_user(token: str | None, cookie_token: str | None = None) -> dict:
    if not settings.proxima_jwt_secret:
        if settings.proxima_allow_insecure_local_auth:
            return {"id": "local", "email": "local@proxima.dev"}
        raise ValueError("PROXIMA_JWT_SECRET is required for authenticated WebSocket access.")
    try:
        payload = jwt.decode(token or cookie_token or "", settings.proxima_jwt_secret, algorithms=[settings.jwt_algorithm])
        return {"id": payload["sub"], "email": payload["email"]}
    except Exception as error:
        raise ValueError("Authentication required.") from error
