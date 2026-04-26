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

        user_id = 42  # Placeholder for user ID extraction logic
        response = await call_next(request)
        log_data = {
            "event": "action_placeholder",
            "user": user_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "client_ip": request.client.host,
        }
        logger.info(log_data)
        return response
