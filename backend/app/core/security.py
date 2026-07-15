from datetime import datetime, timedelta, timezone
import jwt
from uuid import uuid4
from fastapi import HTTPException, Request, status
from .config import settings


def issue_token(user_id: str, email: str) -> str:
    if not settings.proxima_jwt_secret:
        raise HTTPException(status_code=503, detail="PROXIMA_JWT_SECRET is required for authentication.")
    return jwt.encode({"sub": user_id, "email": email, "type": "access", "exp": datetime.now(timezone.utc) + timedelta(minutes=30)}, settings.proxima_jwt_secret, algorithm="HS256")


def issue_refresh_token(user_id: str, email: str) -> str:
    if not settings.proxima_jwt_secret:
        raise HTTPException(status_code=503, detail="PROXIMA_JWT_SECRET is required for authentication.")
    return jwt.encode({"sub": user_id, "email": email, "type": "refresh", "jti": str(uuid4()), "exp": datetime.now(timezone.utc) + timedelta(days=14)}, settings.proxima_jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.proxima_jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as error:
        raise ValueError("Invalid token.") from error


def current_user(request: Request) -> dict:
    if not settings.proxima_jwt_secret:
        return {"id": "local", "email": "local@proxima.dev"}
    token = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, settings.proxima_jwt_secret, algorithms=["HS256"])
        return {"id": payload["sub"], "email": payload["email"]}
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.") from error


def websocket_user(token: str | None) -> dict:
    if not settings.proxima_jwt_secret:
        return {"id": "local", "email": "local@proxima.dev"}
    try:
        payload = jwt.decode(token or "", settings.proxima_jwt_secret, algorithms=["HS256"])
        return {"id": payload["sub"], "email": payload["email"]}
    except Exception as error:
        raise ValueError("Authentication required.") from error
