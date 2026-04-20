import logging
import json
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("vitrolify user actions")

EXCLUDED_PATHS = {
    "/favicon.ico",
}


class UserActionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Add GET method later
        if request.url.path in EXCLUDED_PATHS or request.method in {"HEAD", "OPTIONS"}:
            return await call_next(request)

        user_id = 42  # Placeholder for user ID extraction logic
        response = await call_next(request)
        log_data = {
            "event": "action_placeholder",
            "user": user_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "client_ip": request.client.host
        }
        logger.info(json.dumps(log_data))
        return response
