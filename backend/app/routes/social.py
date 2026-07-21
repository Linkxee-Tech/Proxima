import asyncio
import base64
import json
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from openai import AsyncOpenAI

from ..core.config import settings
from ..core.crypto import decrypt
from ..core.security import current_user
from ..core.store import store
from ..schemas import SocialDraftRequest, SocialPublishRequest

router = APIRouter(prefix="/social", tags=["social"])
PLATFORMS = {"twitter": 280, "linkedin": 3000, "facebook": 63206, "whatsapp": 4096}
ALLOWED_TYPES = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}


class PublishError(Exception):
    pass


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def media_dir() -> Path:
    directory = Path(settings.proxima_data_dir) / "uploads"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def image_record(user_id: str, filename: str, mime_type: str, size: int, source: str) -> dict:
    item = {
        "id": store.id(), "userId": user_id, "filename": filename, "mimeType": mime_type,
        "size": size, "source": source, "url": f"{settings.proxima_public_api_url}/media/{filename}", "createdAt": now(),
    }
    store.data.setdefault("media", []).append(item)
    store.save()
    return item


def fallback_drafts(goal: str, platforms: list[str]) -> dict:
    all_drafts = {
        "twitter": f"We're launching Proxima v2. {goal}",
        "linkedin": f"We’re excited to introduce Proxima v2. {goal}",
        "facebook": f"Proxima v2 is here — {goal}",
        "whatsapp": f"Hi everyone — Proxima v2 is live! {goal}",
    }
    return {platform: all_drafts[platform] for platform in platforms}


def valid_sample_url(image_url: str | None) -> bool:
    return bool(image_url and image_url.startswith("/social-gallery/"))


async def generate_drafts(goal: str, platforms: list[str]) -> tuple[dict, str]:
    if not settings.openai_api_key:
        return fallback_drafts(goal, platforms), "template"
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    prompt = (
        f"Return strict JSON with exactly these keys: {platforms}. Create a distinct, ready-to-review social post for each "
        f"platform for this campaign: {goal}. Match each platform's natural tone. Use factual claims only. "
        "Do not say content was published. Twitter / X must be 280 characters or fewer."
    )
    try:
        response = await client.chat.completions.create(
            model=settings.proxima_social_text_model,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
        )
        drafts = json.loads(response.choices[0].message.content or "{}")
        prepared = {platform: str(drafts[platform]).strip()[:PLATFORMS[platform]] for platform in platforms}
        if any(not value for value in prepared.values()):
            raise ValueError("Empty draft")
        return prepared, "openai"
    except Exception:
        return fallback_drafts(goal, platforms), "template"


async def generate_image(prompt: str, user_id: str) -> dict:
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is required for AI image generation.")
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    try:
        result = await client.images.generate(model=settings.proxima_image_model, prompt=prompt, size="1024x1024", quality="medium")
        encoded = result.data[0].b64_json if result.data else None
    except Exception as error:
        raise HTTPException(status_code=502, detail="AI image generation failed. Check OPENAI_API_KEY and PROXIMA_IMAGE_MODEL.") from error
    if not encoded:
        raise HTTPException(status_code=502, detail="Image model returned no image data.")
    try:
        filename = f"generated-{store.id()}.png"
        payload = base64.b64decode(encoded, validate=True)
        (media_dir() / filename).write_bytes(payload)
    except (ValueError, TypeError) as error:
        raise HTTPException(status_code=502, detail="Image model returned invalid image data.") from error
    return image_record(user_id, filename, "image/png", len(payload), "ai_generated")


def connection_token(user_id: str, platform: str, account_id: str | None = None) -> str:
    connection = next((item for item in store.data.setdefault("connections", []) if item["userId"] == user_id and item["tool"] == platform and (not account_id or item["id"] == account_id)), None)
    if not connection:
        label = "Twitter / X" if platform == "twitter" else platform.title()
        raise PublishError(f"Connect {label} in Integrations before publishing.")
    try:
        return decrypt(connection["accessToken"])
    except (KeyError, ValueError) as error:
        raise PublishError(f"Reconnect {platform.title()}; its saved access token is unavailable.") from error


async def publish_twitter(token: str, text: str) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post("https://api.x.com/2/tweets", headers={"Authorization": f"Bearer {token}"}, json={"text": text})
    if not response.is_success:
        raise PublishError(f"X rejected the post ({response.status_code}): {response.text[:180]}")
    data = response.json().get("data", {})
    return {"providerId": data.get("id"), "url": f"https://x.com/i/web/status/{data['id']}" if data.get("id") else None}


async def linkedin_member_urn(token: str) -> str:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get("https://api.linkedin.com/v2/userinfo", headers=headers)
        if not response.is_success:
            response = await client.get("https://api.linkedin.com/v2/me", headers=headers)
    if not response.is_success:
        raise PublishError(f"LinkedIn could not identify the connected member ({response.status_code}). Reconnect and grant profile access.")
    identity = response.json().get("sub") or response.json().get("id")
    if not identity:
        raise PublishError("LinkedIn did not return the connected member identity.")
    return f"urn:li:person:{identity}"


async def publish_linkedin(token: str, text: str) -> dict:
    author = await linkedin_member_urn(token)
    payload = {
        "author": author,
        "commentary": text,
        "visibility": "PUBLIC",
        "distribution": {"feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": []},
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }
    headers = {
        "Authorization": f"Bearer {token}", "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0", "Linkedin-Version": settings.proxima_linkedin_api_version,
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post("https://api.linkedin.com/rest/posts", headers=headers, json=payload)
    if not response.is_success:
        raise PublishError(f"LinkedIn rejected the post ({response.status_code}): {response.text[:180]}")
    return {"providerId": response.headers.get("x-restli-id"), "url": None}


async def publish_facebook(token: str, text: str) -> dict:
    if not settings.facebook_page_id:
        raise PublishError("Set FACEBOOK_PAGE_ID on the backend before publishing to Facebook Pages.")
    base = f"https://graph.facebook.com/{settings.proxima_meta_graph_api_version}"
    async with httpx.AsyncClient(timeout=20) as client:
        page = await client.get(f"{base}/{settings.facebook_page_id}", params={"fields": "access_token", "access_token": token})
        page_token = page.json().get("access_token") if page.is_success else None
        response = await client.post(
            f"{base}/{settings.facebook_page_id}/feed",
            data={"message": text, "access_token": page_token or token},
        )
    if not response.is_success:
        raise PublishError(f"Facebook rejected the Page post ({response.status_code}): {response.text[:180]}")
    data = response.json()
    return {"providerId": data.get("id"), "url": None}


async def publish_whatsapp(text: str, recipient: str | None) -> dict:
    if not recipient:
        raise PublishError("Add an opted-in WhatsApp recipient before sending a WhatsApp Business message.")
    if not settings.whatsapp_access_token or not settings.whatsapp_phone_number_id:
        raise PublishError("Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID before sending WhatsApp messages.")
    url = f"https://graph.facebook.com/{settings.proxima_meta_graph_api_version}/{settings.whatsapp_phone_number_id}/messages"
    payload = {"messaging_product": "whatsapp", "to": recipient, "type": "text", "text": {"body": text}}
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(url, headers={"Authorization": f"Bearer {settings.whatsapp_access_token}"}, json=payload)
    if not response.is_success:
        raise PublishError(f"WhatsApp rejected the message ({response.status_code}): {response.text[:180]}")
    messages = response.json().get("messages") or []
    return {"providerId": messages[0].get("id") if messages else None, "url": None}


async def publish_platform(post: dict, platform: str) -> dict:
    text = post["content"][platform]
    account_id = (post.get("accountIds") or {}).get(platform)
    if platform == "twitter":
        result = await publish_twitter(connection_token(post["userId"], platform, account_id), text)
    elif platform == "linkedin":
        result = await publish_linkedin(connection_token(post["userId"], platform, account_id), text)
    elif platform == "facebook":
        result = await publish_facebook(connection_token(post["userId"], platform, account_id), text)
    else:
        result = await publish_whatsapp(text, post.get("whatsappRecipient"))
    if post.get("imageId") or post.get("imageUrl"):
        result["warning"] = "This provider dispatch sent the text. Image publishing requires the provider-specific media upload flow."
    return {"status": "published", **result, "publishedAt": now()}


async def deliver(post: dict) -> dict:
    results: dict[str, dict] = {}
    for platform in post["platforms"]:
        try:
            results[platform] = await publish_platform(post, platform)
        except PublishError as error:
            results[platform] = {"status": "failed", "error": str(error), "publishedAt": now()}
        except httpx.HTTPError:
            results[platform] = {"status": "failed", "error": f"{platform.title()} could not be reached. Try again shortly.", "publishedAt": now()}
    succeeded = [item for item in results.values() if item["status"] == "published"]
    post["results"] = results
    post["status"] = "published" if len(succeeded) == len(results) else "partial_failed" if succeeded else "failed"
    post["publishedAt"] = now() if succeeded else None
    post["updatedAt"] = now()
    with store.lock:
        store.save()
    return post


def parse_schedule(value: datetime | None, timezone_name: str) -> str | None:
    if not value:
        return None
    try:
        zone = ZoneInfo(timezone_name or "UTC")
    except ZoneInfoNotFoundError as error:
        raise HTTPException(status_code=422, detail="Choose a valid schedule time zone.") from error
    scheduled = value.replace(tzinfo=zone) if value.tzinfo is None else value
    scheduled_utc = scheduled.astimezone(timezone.utc)
    if scheduled_utc <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="Choose a future time for a scheduled post.")
    return scheduled_utc.isoformat()


@router.post("/draft")
async def draft(payload: SocialDraftRequest, user: dict = Depends(current_user)) -> dict:
    platforms = list(dict.fromkeys(payload.platforms))
    if not platforms or any(platform not in PLATFORMS for platform in platforms):
        raise HTTPException(status_code=422, detail="Select one or more supported social platforms.")
    drafts, source = await generate_drafts(payload.goal, platforms)
    image = None
    image_error = None
    if payload.generate_image:
        if not settings.openai_api_key:
            image_error = "Text drafts were created, but AI image generation is not configured."
        else:
            try:
                image = await generate_image(payload.image_prompt or f"Campaign image for: {payload.goal}", user["id"])
            except HTTPException as error:
                image_error = error.detail
            except Exception:
                image_error = "AI image generation failed. Check the image provider and media storage configuration."
    result = {"drafts": drafts, "source": source, "image": image, "limits": {platform: PLATFORMS[platform] for platform in platforms}}
    if image_error:
        result["imageError"] = image_error
    return result


@router.post("/upload", status_code=201)
async def upload(file: UploadFile = File(...), user: dict = Depends(current_user)) -> dict:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Only PNG, JPEG, and WebP images are supported.")
    payload = await file.read(settings.proxima_upload_max_bytes + 1)
    if not payload or len(payload) > settings.proxima_upload_max_bytes:
        raise HTTPException(status_code=413, detail="Image must be between 1 byte and 10 MiB.")
    filename = f"upload-{store.id()}{ALLOWED_TYPES[file.content_type]}"
    (media_dir() / filename).write_bytes(payload)
    return image_record(user["id"], filename, file.content_type, len(payload), "uploaded")


@router.post("/publish", status_code=202)
async def publish(payload: SocialPublishRequest, user: dict = Depends(current_user)) -> dict:
    platforms = list(dict.fromkeys(payload.platforms))
    if not platforms or any(platform not in PLATFORMS for platform in platforms):
        raise HTTPException(status_code=422, detail="Select supported platforms.")
    for platform in platforms:
        text = payload.content.get(platform, "")
        if not text.strip() or len(text) > PLATFORMS[platform]:
            raise HTTPException(status_code=422, detail=f"Invalid {platform} post content.")
    if payload.image_id and not any(image["id"] == payload.image_id and image["userId"] == user["id"] for image in store.data.get("media", [])):
        raise HTTPException(status_code=404, detail="Image not found.")
    if payload.image_url and not valid_sample_url(payload.image_url) and not payload.image_id:
        raise HTTPException(status_code=422, detail="Image URL must come from the sample gallery or an uploaded image.")
    scheduled_for = parse_schedule(payload.scheduled_for, payload.schedule_timezone)
    post = {
        "id": store.id(), "userId": user["id"], "content": {platform: payload.content[platform].strip() for platform in platforms},
        "platforms": platforms, "accountIds": {platform: payload.account_ids[platform] for platform in platforms if payload.account_ids.get(platform)}, "imageId": payload.image_id, "imageUrl": payload.image_url,
        "whatsappRecipient": payload.whatsapp_recipient, "scheduledFor": scheduled_for,
        "status": "scheduled" if scheduled_for else "publishing" if payload.approved else "awaiting_approval", "results": {}, "createdAt": now(),
    }
    with store.lock:
        store.data.setdefault("socialPosts", []).append(post)
        store.save()
    if payload.approved and not scheduled_for:
        return await deliver(post)
    return post


def owned_post(post_id: str, user_id: str) -> dict:
    post = next((item for item in store.data.setdefault("socialPosts", []) if item["id"] == post_id and item["userId"] == user_id), None)
    if not post:
        raise HTTPException(status_code=404, detail="Campaign post not found.")
    return post


@router.post("/{post_id}/approve")
async def approve(post_id: str, user: dict = Depends(current_user)) -> dict:
    post = owned_post(post_id, user["id"])
    if post["status"] != "awaiting_approval":
        raise HTTPException(status_code=409, detail="Only posts awaiting approval can be published now.")
    post["status"] = "publishing"
    post["updatedAt"] = now()
    with store.lock:
        store.save()
    return await deliver(post)


@router.get("/posts")
def posts(user: dict = Depends(current_user)) -> dict:
    items = [post for post in store.data.setdefault("socialPosts", []) if post["userId"] == user["id"]]
    return {"items": sorted(items, key=lambda item: item["createdAt"], reverse=True)}


@router.get("/accounts")
def accounts(user: dict = Depends(current_user)) -> dict:
    labels = {"twitter": "Twitter / X", "linkedin": "LinkedIn", "facebook": "Facebook Pages"}
    items = []
    for connection in store.data.setdefault("connections", []):
        if connection["userId"] != user["id"] or connection["tool"] not in labels:
            continue
        items.append({"id": connection["id"], "platform": connection["tool"], "label": connection.get("accountLabel") or f"{labels[connection['tool']]} account", "connectedAt": connection.get("connectedAt")})
    return {"items": items}


@router.get("/scheduled")
def scheduled(user: dict = Depends(current_user)) -> dict:
    return {"items": [post for post in store.data.setdefault("socialPosts", []) if post["userId"] == user["id"] and post["status"] == "scheduled"]}


@router.delete("/{post_id}")
def cancel(post_id: str, user: dict = Depends(current_user)) -> dict:
    post = owned_post(post_id, user["id"])
    if post["status"] not in {"scheduled", "awaiting_approval"}:
        raise HTTPException(status_code=409, detail="Only scheduled or unapproved posts can be cancelled.")
    post["status"] = "cancelled"
    post["updatedAt"] = now()
    store.save()
    return {"ok": True}


@router.put("/{post_id}")
def update_post(post_id: str, payload: SocialPublishRequest, user: dict = Depends(current_user)) -> dict:
    post = owned_post(post_id, user["id"])
    if post["status"] not in {"scheduled", "awaiting_approval"}:
        raise HTTPException(status_code=409, detail="Only scheduled or unapproved posts can be edited.")
    if payload.image_url and not valid_sample_url(payload.image_url) and not payload.image_id:
        raise HTTPException(status_code=422, detail="Image URL must come from the sample gallery or an uploaded image.")
    post.update({"content": payload.content, "platforms": payload.platforms, "accountIds": payload.account_ids, "imageId": payload.image_id, "imageUrl": payload.image_url, "whatsappRecipient": payload.whatsapp_recipient, "scheduledFor": parse_schedule(payload.scheduled_for, payload.schedule_timezone), "updatedAt": now()})
    store.save()
    return post


@router.get("/analytics")
def analytics(user: dict = Depends(current_user)) -> dict:
    posts_for_user = [post for post in store.data.setdefault("socialPosts", []) if post["userId"] == user["id"]]
    published = [post for post in posts_for_user if post["status"] in {"published", "partial_failed"}]
    counts = {platform: 0 for platform in PLATFORMS}
    for post in published:
        for platform, result in post.get("results", {}).items():
            if result.get("status") == "published":
                counts[platform] += 1
    return {"posts": len(posts_for_user), "engagement": {"likes": 0, "shares": 0, "comments": 0, "clicks": 0}, "platforms": counts}


async def dispatch_due_posts() -> None:
    """Claim due work before sending so a post is not dispatched twice by this process."""
    due: list[dict] = []
    current = datetime.now(timezone.utc)
    with store.lock:
        for post in store.data.setdefault("socialPosts", []):
            if post.get("status") != "scheduled" or not post.get("scheduledFor"):
                continue
            try:
                scheduled_time = datetime.fromisoformat(post["scheduledFor"].replace("Z", "+00:00"))
            except ValueError:
                post["status"] = "failed"
                post["results"] = {"schedule": {"status": "failed", "error": "The stored schedule time is invalid."}}
                continue
            if scheduled_time <= current:
                post["status"] = "publishing"
                post["updatedAt"] = now()
                due.append(post)
        if due:
            store.save()
    for post in due:
        await deliver(post)


async def scheduler_loop() -> None:
    while True:
        try:
            await dispatch_due_posts()
        except Exception:
            # Individual provider failures are captured on the post. Keep the scheduler alive for later work.
            pass
        await asyncio.sleep(settings.proxima_social_scheduler_interval_seconds)
