import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import (
    APIRouter,
    Depends,
    Query,
    WebSocket,
    WebSocketDisconnect,
    WebSocketException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_id_ws
from app.db.redis import clear_active_device, set_active_device
from app.db.session import get_db
from app.models.playlist import Playlist
from app.services.playlist_service import (
    get_playlist_by_id,
    user_has_playlist_permission,
)
from app.websockets.playlist_manager import playlist_ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws/playlists", tags=["websockets"])


@asynccontextmanager
async def get_db_context():
    async for db in get_db():
        yield db


@router.websocket("/{playlist_id}")
async def playlist_websocket_endpoint(
    websocket: WebSocket,
    playlist_id: int,
    user_id: uuid.UUID = Depends(get_current_user_id_ws),
    device_id: str | None = Query(default=None),
):
    is_owner = False

    try:
        async with get_db_context() as db:
            playlist = await _verify_playlist_access(
                db=db, user_id=user_id, playlist_id=playlist_id
            )
            is_owner = playlist.owner_id == user_id
    except WebSocketException as e:
        raise e
    except Exception as e:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason=str(e))

    await playlist_ws_manager.connect_to_playlist(websocket, playlist_id, user_id)
    if is_owner and device_id:
        await set_active_device(playlist_id, device_id)

    try:
        while True:
            _ = await websocket.receive_text()

    except WebSocketDisconnect:
        playlist_ws_manager.disconnect_from_playlist(websocket, playlist_id, user_id)

    except Exception as e:
        logger.error(
            {
                "event": "websocket_connecting",
                "user": user_id,
                "room": playlist_id,
                "msg": str(e),
            }
        )
        playlist_ws_manager.disconnect_from_playlist(websocket, playlist_id, user_id)

    finally:
        if is_owner and device_id:
            await clear_active_device(playlist_id, device_id)


async def _verify_playlist_access(
    db: AsyncSession, user_id: uuid.UUID, playlist_id: int
) -> Playlist:
    playlist = await get_playlist_by_id(db, playlist_id)
    if not playlist:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION, reason="Playlist não encontrada"
        )

    is_authorized = await user_has_playlist_permission(
        db=db, user_id=user_id, playlist=playlist, action="read"
    )

    if not is_authorized:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Você não tem permissão para acessar esta playlist privada",
        )
    return playlist


# 2. Document-only HTTP GET route (shown in Swagger UI)
@router.get(
    "/playlists/{playlist_id}",
    summary="WebSocket: Real-time Playlist Updates",
    description="""
    **Protocol:** `WS` / `WSS`
    
    Establishes a WebSocket connection for live playlist events.
    """,
    include_in_schema=True,
)
def ws_docs_placeholder(playlist_id: int, device_id: str | None = Query(default=None)):
    """Placeholder route purely to render WebSocket specifications in Swagger UI."""
    pass
