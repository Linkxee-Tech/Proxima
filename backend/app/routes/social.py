import base64
import json
import mimetypes
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from openai import AsyncOpenAI
from ..core.config import settings
from ..core.security import current_user
from ..core.store import store
from ..schemas import SocialDraftRequest, SocialPublishRequest

router = APIRouter(prefix="/social", tags=["social"])
PLATFORMS = {"twitter": 280, "linkedin": 3000, "facebook": 63206, "whatsapp": 4096}
ALLOWED_TYPES = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}

def now() -> str: return datetime.now(timezone.utc).isoformat()
def media_dir() -> Path:
    directory = Path(settings.proxima_data_dir) / "uploads"; directory.mkdir(parents=True, exist_ok=True); return directory
def image_record(user_id: str, filename: str, mime_type: str, size: int, source: str) -> dict:
    item = {"id":store.id(), "userId":user_id, "filename":filename, "mimeType":mime_type, "size":size, "source":source, "url":f"{settings.proxima_public_api_url}/media/{filename}", "createdAt":now()}
    store.data.setdefault("media", []).append(item); store.save(); return item
def fallback_drafts(goal: str, platforms: list[str]) -> dict:
    all_drafts = {"twitter":f"We're launching Proxima v2. {goal}", "linkedin":f"We’re excited to introduce Proxima v2. {goal}", "facebook":f"Proxima v2 is here — {goal}", "whatsapp":f"Hi everyone — Proxima v2 is live! {goal}"}
    return {platform: all_drafts[platform] for platform in platforms}

async def generate_drafts(goal: str, platforms: list[str]) -> dict:
    if not settings.openai_api_key: return fallback_drafts(goal, platforms)
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    prompt = f"Return strict JSON with keys {platforms}. Create platform-specific launch post drafts for: {goal}. Twitter must be ≤280 characters; use factual claims only."
    try:
        response = await client.chat.completions.create(model=settings.proxima_social_text_model, response_format={"type":"json_object"}, messages=[{"role":"user", "content":prompt}])
        raw_drafts = response.choices[0].message.content or "{}"
    except Exception:
        return fallback_drafts(goal, platforms)
    try:
        drafts = json.loads(raw_drafts)
        return {platform: str(drafts[platform])[:PLATFORMS[platform]] for platform in platforms}
    except Exception:
        return fallback_drafts(goal, platforms)

async def generate_image(prompt: str, user_id: str) -> dict:
    if not settings.openai_api_key: raise HTTPException(status_code=503, detail="OPENAI_API_KEY is required for AI image generation.")
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    result = await client.images.generate(model=settings.proxima_image_model, prompt=prompt, size="1024x1024", quality="medium")
    encoded = result.data[0].b64_json
    if not encoded: raise HTTPException(status_code=502, detail="Image model returned no image data.")
    filename = f"generated-{store.id()}.png"; payload = base64.b64decode(encoded); (media_dir() / filename).write_bytes(payload)
    return image_record(user_id, filename, "image/png", len(payload), "ai_generated")

@router.post("/draft")
async def draft(payload: SocialDraftRequest, user: dict = Depends(current_user)) -> dict:
    platforms = list(dict.fromkeys(payload.platforms))
    if not platforms or any(platform not in PLATFORMS for platform in platforms): raise HTTPException(status_code=422, detail="Select one or more supported social platforms.")
    drafts = await generate_drafts(payload.goal, platforms)
    image = await generate_image(payload.image_prompt or f"Campaign image for: {payload.goal}", user["id"]) if payload.generate_image else None
    return {"drafts":drafts, "image":image, "limits":{platform:PLATFORMS[platform] for platform in platforms}}

@router.post("/upload", status_code=201)
async def upload(file: UploadFile = File(...), user: dict = Depends(current_user)) -> dict:
    if file.content_type not in ALLOWED_TYPES: raise HTTPException(status_code=415, detail="Only PNG, JPEG, and WebP images are supported.")
    payload = await file.read(settings.proxima_upload_max_bytes + 1)
    if not payload or len(payload) > settings.proxima_upload_max_bytes: raise HTTPException(status_code=413, detail="Image must be between 1 byte and 10 MiB.")
    filename = f"upload-{store.id()}{ALLOWED_TYPES[file.content_type]}"; (media_dir() / filename).write_bytes(payload)
    return image_record(user["id"], filename, file.content_type, len(payload), "uploaded")

@router.post("/publish", status_code=202)
def publish(payload: SocialPublishRequest, user: dict = Depends(current_user)) -> dict:
    platforms = list(dict.fromkeys(payload.platforms))
    if not platforms or any(platform not in PLATFORMS for platform in platforms): raise HTTPException(status_code=422, detail="Select supported platforms.")
    for platform in platforms:
        text = payload.content.get(platform, "")
        if not text.strip() or len(text) > PLATFORMS[platform]: raise HTTPException(status_code=422, detail=f"Invalid {platform} post content.")
    if payload.image_id and not any(image["id"] == payload.image_id and image["userId"] == user["id"] for image in store.data.get("media", [])): raise HTTPException(status_code=404, detail="Image not found.")
    post = {"id":store.id(), "userId":user["id"], "content":payload.content, "platforms":platforms, "imageId":payload.image_id, "scheduledFor":payload.scheduled_for, "status":"scheduled" if payload.scheduled_for else "awaiting_approval", "createdAt":now()}
    store.data.setdefault("socialPosts", []).append(post); store.save(); return post

@router.get("/scheduled")
def scheduled(user: dict = Depends(current_user)) -> dict: return {"items":[post for post in store.data.get("socialPosts", []) if post["userId"] == user["id"] and post["status"] == "scheduled"]}

@router.delete("/{post_id}")
def cancel(post_id: str, user: dict = Depends(current_user)) -> dict:
    post = next((item for item in store.data.get("socialPosts", []) if item["id"] == post_id and item["userId"] == user["id"]), None)
    if not post: raise HTTPException(status_code=404, detail="Scheduled post not found.")
    post["status"] = "cancelled"; store.save(); return {"ok":True}

@router.put("/{post_id}")
def update_post(post_id: str, payload: SocialPublishRequest, user: dict = Depends(current_user)) -> dict:
    post = next((item for item in store.data.get("socialPosts", []) if item["id"] == post_id and item["userId"] == user["id"]), None)
    if not post: raise HTTPException(status_code=404, detail="Scheduled post not found.")
    post.update({"content":payload.content, "platforms":payload.platforms, "imageId":payload.image_id, "scheduledFor":payload.scheduled_for, "updatedAt":now()}); store.save(); return post

@router.get("/analytics")
def analytics(user: dict = Depends(current_user)) -> dict:
    posts = [post for post in store.data.get("socialPosts", []) if post["userId"] == user["id"]]
    return {"posts":len(posts), "engagement":{"likes":0,"shares":0,"comments":0,"clicks":0}, "platforms":{platform:0 for platform in PLATFORMS}}
