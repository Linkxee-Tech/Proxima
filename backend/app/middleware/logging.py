from time import perf_counter
from starlette.middleware.base import BaseHTTPMiddleware
from ..kernel.observability import structured

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        started=perf_counter(); response=await call_next(request)
        structured("http_request", method=request.method, path=request.url.path, status=response.status_code, durationMs=round((perf_counter()-started)*1000, 2))
        return response
