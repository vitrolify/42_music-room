"""Dependencias de autenticacao (T013)."""

import logging
import uuid

from fastapi import Depends, Header, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.error_handlers import BaseVitrolifyException
from app.auth.firebase_auth import get_firebase_token_verifier
from app.db.session import get_db
from app.models.user import User

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

    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            firebase_uid=firebase_uid,
            email=claims.get("email"),
            display_name=claims.get("name"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user.id