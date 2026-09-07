import uuid
from contextlib import asynccontextmanager

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    WebSocketException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_id, get_current_user_id_ws
from app.db.session import get_db
from app.models.user_playback_state import UserPlaybackState
from app.schemas.playback import PlaybackCommand, PlaybackEvent, PlaybackStateRead
from app.services.playback_service import apply_command, get_state
from app.websockets.playback_manager import playback_ws_manager

router = APIRouter(prefix="/playback", tags=["playback"])
ws_router = APIRouter(prefix="/ws", tags=["playback"])


@asynccontextmanager
async def db_context():
    async for db in get_db():
        yield db


def read_state(state: UserPlaybackState) -> PlaybackStateRead:
    return PlaybackStateRead.model_validate(state, from_attributes=True)


@router.get("/state", response_model=PlaybackStateRead | None)
async def playback_state(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    state = await get_state(db, user_id)
    return read_state(state) if state and state.video_id else None


@router.put("/state", response_model=PlaybackEvent)
async def update_playback(
    payload: PlaybackCommand,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    try:
        state = await apply_command(db, user_id, payload, payload.session_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    event = PlaybackEvent(version=state.version, payload=read_state(state))
    await playback_ws_manager.publish(user_id, event.model_dump(mode="json"))
    return event


@ws_router.websocket("/playback")
async def playback_websocket(
    websocket: WebSocket,
    user_id: uuid.UUID = Depends(get_current_user_id_ws),
    session_id: str | None = None,
):
    if not session_id or len(session_id) > 128:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="session_id is required",
        )
    await playback_ws_manager.connect(websocket, user_id)
    try:
        async with db_context() as db:
            state = await get_state(db, user_id)
            if state and state.video_id:
                event = PlaybackEvent(version=state.version, payload=read_state(state))
                await websocket.send_json(event.model_dump(mode="json"))
        while True:
            raw = await websocket.receive_json()
            command = PlaybackCommand.model_validate({**raw, "session_id": session_id})
            async with db_context() as db:
                state = await apply_command(db, user_id, command, session_id)
            event = PlaybackEvent(
                version=state.version,
                payload=read_state(state),
            ).model_dump(mode="json")
            await playback_ws_manager.publish(user_id, event)
    except WebSocketDisconnect:
        playback_ws_manager.disconnect(websocket, user_id)
    except Exception as exc:
        playback_ws_manager.disconnect(websocket, user_id)
        try:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=str(exc))
        except Exception:
            pass
