from collections import defaultdict, deque
from time import monotonic

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from ..core.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Small process-local guard; Redis can be used by the worker layer for distributed jobs."""

    def __init__(self, app):
        super().__init__(app)
        self._requests: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or request.url.path in {"/health", "/api/v1/health", "/api/metrics/prometheus"}:
            return await call_next(request)
        now = monotonic()
        key = f"{request.client.host if request.client else 'unknown'}:{request.url.path}"
        bucket = self._requests[key]
        while bucket and bucket[0] <= now - 60:
            bucket.popleft()
        if len(bucket) >= settings.proxima_rate_limit_per_minute:
            return JSONResponse({"detail": "Rate limit exceeded. Try again shortly."}, status_code=429, headers={"Retry-After": "60"})
        bucket.append(now)
        return await call_next(request)
