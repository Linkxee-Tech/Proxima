from datetime import datetime, timezone
from ..core.store import store


def append_log(workflow: dict, message: str, level: str = "info") -> None:
    workflow.setdefault("auditTrail", []).append({"id":store.id(), "at":datetime.now(timezone.utc).isoformat(), "level":level, "message":message})
    workflow["updatedAt"] = datetime.now(timezone.utc).isoformat()
    store.save()
