import logging
from typing import override

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(f"{__name__}")

EXCLUDED_PATHS = {
    "/favicon.ico",
    "/metrics",
}


class UserActionMiddleware(BaseHTTPMiddleware):
    @override
    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXCLUDED_PATHS:
            return await call_next(request)

        response = await call_next(request)

        user_id = getattr(request.state, "user_id", None)
        log_data = {
            "event": "user_action",
            "user": str(user_id) if user_id else "anonymous",
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "client_ip": request.client.host if request.client else "unknown",
        }
        logger.info(log_data)
        return response
