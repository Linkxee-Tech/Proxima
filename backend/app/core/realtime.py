from collections import defaultdict
from fastapi import WebSocket


class RealtimeHub:
    """Process-local workflow updates for authenticated dashboard clients."""

    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[user_id].add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        connections = self._connections.get(user_id)
        if not connections:
            return
        connections.discard(websocket)
        if not connections:
            self._connections.pop(user_id, None)

    async def workflow_updated(self, workflow: dict) -> None:
        user_id = workflow["userId"]
        stale: list[WebSocket] = []
        for websocket in tuple(self._connections.get(user_id, ())):
            try:
                await websocket.send_json({"type": "workflow.updated", "workflow": workflow})
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(user_id, websocket)


realtime = RealtimeHub()
