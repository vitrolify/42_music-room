import logging
import os

from fastapi import APIRouter, Depends, status
from firebase_admin import auth

from app.auth.dependencies import get_current_user
from app.auth.firebase_auth import _get_app
from app.db.redis import revoke_user_sessions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    claims: dict = Depends(get_current_user),
) -> None:
    """Revokes all active sessions for the current user."""
    firebase_uid = claims.get("sub")
    if firebase_uid:
        await revoke_user_sessions(firebase_uid)
        if os.getenv("LOAD_TEST_MODE") != "True":
            try:
                auth.revoke_refresh_tokens(firebase_uid, app=_get_app())
            except Exception as exc:
                logger.warning("Failed to revoke Firebase refresh tokens: %s", exc)
