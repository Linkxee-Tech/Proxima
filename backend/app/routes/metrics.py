from fastapi import APIRouter, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest

router = APIRouter(tags=["metrics"])
REQUESTS = Counter("proxima_http_requests_total", "Proxima HTTP requests", ["method", "path", "status"])

@router.get("/metrics")
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
