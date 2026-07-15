from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from ..core.store import store
from ..core.security import current_user
from ..schemas import MemoryRequest
from ..memory.mesh import search as mesh_search

router = APIRouter(prefix="/memory", tags=["memory"])

def owned(memory_id: str, user_id: str) -> dict:
    memory = next((item for item in store.data["memories"] if item["id"] == memory_id and item["userId"] == user_id), None)
    if not memory: raise HTTPException(status_code=404, detail="Memory not found.")
    return memory

@router.get("/search")
def search(q: str = "", user: dict = Depends(current_user)) -> dict:
    items = [item for item in store.data["memories"] if item["userId"] == user["id"]]
    return {"items": mesh_search(items, q, 50) if q else items[:50]}

@router.get("")
def list_memories(q: str = "", offset: int = 0, limit: int = 50, user: dict = Depends(current_user)) -> dict:
    query = q.lower(); items = [item for item in store.data["memories"] if item["userId"] == user["id"] and query in item["text"].lower()]
    return {"items":items[offset:offset + min(limit, 100)], "total":len(items)}

@router.post("", status_code=201)
def create(payload: MemoryRequest, user: dict = Depends(current_user)) -> dict:
    memory = {"id":store.id(), "userId":user["id"], "text":payload.text, "metadata":{"action":"manual_memory"}, "createdAt":datetime.now(timezone.utc).isoformat()}
    with store.lock: store.data["memories"].insert(0, memory); store.save()
    return memory

@router.patch("/{memory_id}")
def update(memory_id: str, payload: MemoryRequest, user: dict = Depends(current_user)) -> dict:
    memory = owned(memory_id, user["id"]); memory["text"] = payload.text; memory["updatedAt"] = datetime.now(timezone.utc).isoformat(); store.save(); return memory

@router.put("/{memory_id}")
def replace(memory_id: str, payload: MemoryRequest, user: dict = Depends(current_user)) -> dict:
    return update(memory_id, payload, user)

@router.get("/{memory_id}")
def get_memory(memory_id: str, user: dict = Depends(current_user)) -> dict: return owned(memory_id, user["id"])

@router.delete("/{memory_id}")
def delete(memory_id: str, user: dict = Depends(current_user)) -> dict:
    memory = owned(memory_id, user["id"])
    with store.lock: store.data["memories"].remove(memory); store.save()
    return {"ok": True}
