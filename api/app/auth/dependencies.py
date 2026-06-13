"""Dependencias de autenticacao (T013)."""

import logging

from fastapi import Header, status

from app.api.error_handlers import BaseVitrolifyException
from app.auth.firebase_auth import get_firebase_token_verifier

logger = logging.getLogger(__name__)


def get_current_user(authorization: str = Header(default="")) -> dict:
    """Le o header Authorization, valida o token via T012, devolve os claims."""
    if not authorization.startswith("Bearer "):
        raise BaseVitrolifyException(
            error_code="AUTH_MISSING_BEARER",
            message="Authorization header ausente ou sem 'Bearer'",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    token = authorization.removeprefix("Bearer ")

    try:
        return get_firebase_token_verifier().verify(token)
    except Exception as exc:
        logger.error("Token verification failed: %s", exc)
        raise BaseVitrolifyException(
            error_code="AUTH_INVALID_TOKEN",
            message=f"Token verification failed: {exc}",
            status_code=status.HTTP_401_UNAUTHORIZED,
        ) from exc