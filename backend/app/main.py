from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from .core.config import settings
from .core.security import websocket_user
from .middleware.logging import LoggingMiddleware
from .middleware.rate_limit import RateLimitMiddleware
from .middleware.exceptions import unhandled_exception
from .routes import health, auth, workflows, memory, integrations, social, approvals, history, deploy, tools, metrics

app = FastAPI(title="Proxima OS API", version="1.0.0", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_exception_handler(Exception, unhandled_exception)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.proxima_cors_origins.split(",")],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
api = FastAPI()
for router in (health.router, auth.router, tools.router, workflows.router, memory.router, integrations.router, social.router, approvals.router, history.router, deploy.router, metrics.router): api.include_router(router)
app.mount("/api/v1", api)
app.mount("/api", api)


@app.get("/health", include_in_schema=False)
def root_health() -> dict:
    """Stable platform health-check path for Render and other hosts."""
    return health.health()


@app.get("/docs", include_in_schema=False)
def root_docs() -> RedirectResponse:
    return RedirectResponse("/api/v1/docs")


@app.get("/openapi.json", include_in_schema=False)
def root_openapi() -> RedirectResponse:
    return RedirectResponse("/api/v1/openapi.json")

Path(settings.proxima_data_dir, "uploads").mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(Path(settings.proxima_data_dir) / "uploads"), check_dir=False), name="media")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    try:
        websocket_user(websocket.query_params.get("token"), websocket.cookies.get("proxima_access_token"))
    except ValueError:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    await websocket.send_json({"type": "connected", "service": "proxima-fastapi"})
    try:
        while True:
            await websocket.receive_text()
            await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        return
