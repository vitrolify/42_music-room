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
        user = str(user_id) if user_id else "anonymous"
        client_ip = request.client.host if request.client else "unknown"
        logger.info(
            "%s %s %d - user=%s ip=%s",
            request.method,
            request.url.path,
            response.status_code,
            user,
            client_ip,
        )
        return response
