from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

async def unhandled_exception(_request: Request, _error: Exception) -> JSONResponse:
    if isinstance(_error, HTTPException):
        return JSONResponse(status_code=_error.status_code, content={"detail": _error.detail})
    return JSONResponse(status_code=500, content={"detail":"Internal server error."})
