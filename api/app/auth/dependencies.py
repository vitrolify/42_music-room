import logging
import uuid

from fastapi import (
    Depends,
    Header,
    Query,
    Request,
    WebSocket,
    WebSocketException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.error_handlers import BaseVitrolifyException
from app.auth.firebase_auth import get_firebase_token_verifier
from app.db.session import get_db
from app.services.user_service import UserService

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


async def get_current_user_id(
    request: Request,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID:
    """Pega o firebase_uid do token e retorna o user.id local. Cria se nao existir."""
    firebase_uid = claims.get("sub")
    if not firebase_uid:
        raise BaseVitrolifyException(
            error_code="AUTH_NO_FIREBASE_UID",
            message="Token nao contem firebase_uid",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    user_service = UserService(db)
    user = await user_service.get_or_create(
        firebase_uid=firebase_uid,
        email=claims.get("email"),
        display_name=claims.get("name"),
    )

    request.state.user_id = user.id
    return user.id


async def get_current_user_id_ws(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
    token: str | None = Query(default=None),
) -> uuid.UUID:
    if not token:
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.removeprefix("Bearer ")

    if not token:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION, reason="Token de autenticação ausente"
        )

    try:
        claims = get_firebase_token_verifier().verify(token)
    except Exception as exc:
        logger.error("WS Token verification failed: %s", exc)
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason=f"Token verification failed: {exc}",
        )

    firebase_uid = claims.get("sub")
    if not firebase_uid:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION, reason="Token não contém firebase_uid"
        )

    user_service = UserService(db)
    user = await user_service.get_or_create(
        firebase_uid=firebase_uid,
        email=claims.get("email"),
        display_name=claims.get("name"),
    )

    websocket.state.user_id = user.id
    return user.id
