from fastapi import APIRouter
from ..core.config import settings

router = APIRouter(tags=["health"])

@router.get("/health")
def health() -> dict:
    return {"ok": True, "service": "proxima-fastapi", "openai": bool(settings.openai_api_key), "pinecone": bool(settings.pinecone_api_key), "redis": bool(settings.redis_url)}
