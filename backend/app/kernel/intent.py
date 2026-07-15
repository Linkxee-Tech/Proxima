import json
from openai import AsyncOpenAI
from ..core.config import settings


async def parse_goal(goal: str) -> dict:
    """Use the reasoning model when configured, with a safe deterministic fallback."""
    social = [name for name in ("twitter", "linkedin", "facebook", "whatsapp") if name in goal.lower()]
    fallback = {"action": "multi_platform_social_publish" if social else "automation", "summary": goal, "entities": {"channels": social}, "requiresApproval": bool(social)}
    if not settings.openai_api_key: return fallback
    try:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(model=settings.proxima_openai_model, response_format={"type": "json_object"}, messages=[{"role":"system","content":"Return JSON: action, summary, entities, requiresApproval."},{"role":"user","content":goal}])
        result = json.loads(response.choices[0].message.content or "{}")
        return {**fallback, **result}
    except Exception:
        return fallback
