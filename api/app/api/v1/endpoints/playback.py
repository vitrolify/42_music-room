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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_id, get_current_user_id_ws
from app.db.session import get_db
from app.models.device import Device, DeviceDelegation
from app.models.track_info import TrackInfo
from app.models.user import User
from app.models.user_playback_state import UserPlaybackState
from app.schemas.playback import (
    PlaybackCommand,
    PlaybackEvent,
    PlaybackSessionRead,
    PlaybackSessionTrack,
    PlaybackStateRead,
)
from app.services.device_service import has_device_delegation, user_owns_device
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


@router.get("/sessions", response_model=list[PlaybackSessionRead])
async def playback_sessions(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """List the current user's playback and authorized delegated playbacks."""
    sessions: list[PlaybackSessionRead] = []

    own_result = await db.execute(
        select(UserPlaybackState, User.display_name, Device.name, TrackInfo.title,
               TrackInfo.channel_title, TrackInfo.thumbnail_url)
        .join(User, User.id == UserPlaybackState.user_id)
        .outerjoin(Device, Device.id == UserPlaybackState.controller_device_id)
        .outerjoin(TrackInfo, TrackInfo.id == UserPlaybackState.video_id)
        .where(UserPlaybackState.user_id == user_id,
               UserPlaybackState.video_id != "")
    )
    for (
        state, owner_name, device_name, title, channel_title, thumbnail_url
    ) in own_result:
        sessions.append(_session_read(
            state, owner_name, device_name, title, channel_title, thumbnail_url,
            shared=False,
        ))

    delegated_result = await db.execute(
        select(UserPlaybackState, User.display_name, Device.name, TrackInfo.title,
               TrackInfo.channel_title, TrackInfo.thumbnail_url)
        .join(User, User.id == UserPlaybackState.user_id)
        .join(Device, Device.id == UserPlaybackState.controller_device_id)
        .join(DeviceDelegation, DeviceDelegation.device_id == Device.id)
        .outerjoin(TrackInfo, TrackInfo.id == UserPlaybackState.video_id)
        .where(DeviceDelegation.delegate_user_id == user_id,
               UserPlaybackState.video_id != "")
        .order_by(User.display_name, UserPlaybackState.user_id)
    )
    seen: set[uuid.UUID] = set()
    for (
        state, owner_name, device_name, title, channel_title, thumbnail_url
    ) in delegated_result:
        if state.user_id in seen or state.user_id == user_id:
            continue
        seen.add(state.user_id)
        sessions.append(_session_read(
            state, owner_name, device_name, title, channel_title, thumbnail_url,
            shared=True,
        ))
    return sessions


def _session_read(
    state, owner_name, device_name, title, channel_title, thumbnail_url, *, shared
):
    return PlaybackSessionRead(
        session_id=str(state.user_id), shared=shared, owner_id=state.user_id,
        owner_name=owner_name, playlist_id=state.active_playlist_id,
        track=PlaybackSessionTrack(
            id=state.active_playlist_track_id, video_id=state.video_id,
            title=title, channel_title=channel_title, thumbnail_url=thumbnail_url,
        ), status=state.status, position_seconds=state.position_seconds,
        duration_seconds=state.duration_seconds, version=state.version,
        controller_device_id=state.controller_device_id,
        controller_device_name=device_name, updated_at=state.updated_at,
    )


@router.put("/state", response_model=PlaybackEvent)
async def update_playback(
    payload: PlaybackCommand,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    try:
        state = await apply_command(db, user_id, payload, payload.session_id)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)
        ) from exc
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
    device_id: uuid.UUID | None = None,
    owner_id: uuid.UUID | None = None,
):
    if not session_id or len(session_id) > 128:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="session_id is required",
        )
    if not device_id:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION, reason="device_id is required"
        )
    async with db_context() as db:
        if not await user_owns_device(db, device_id, user_id):
            raise WebSocketException(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="device_id is not registered to this user",
            )
        room_owner_id = owner_id or user_id
        state = await get_state(db, room_owner_id)
        if owner_id and (
            not state
            or not state.video_id
            or owner_id != user_id
            and (
                not state.controller_device_id
                or not await has_device_delegation(
                    db, state.controller_device_id, user_id
                )
            )
        ):
            raise WebSocketException(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Playback session is not authorized",
            )
    await playback_ws_manager.connect(
        websocket,
        room_owner_id,
        user_id,
        state.controller_device_id if state else None,
    )
    try:
        async with db_context() as db:
            state = await get_state(db, room_owner_id)
            if state and state.video_id:
                event = PlaybackEvent(version=state.version, payload=read_state(state))
                await websocket.send_json(event.model_dump(mode="json"))
        while True:
            raw = await websocket.receive_json()
            if owner_id:
                raise WebSocketException(
                    code=status.WS_1008_POLICY_VIOLATION,
                    reason="Playback commands must use the playlist playback endpoint",
                )
            command = PlaybackCommand.model_validate(
                {**raw, "session_id": session_id, "device_id": str(device_id)}
            )
            async with db_context() as db:
                state = await apply_command(db, user_id, command, session_id)
            event = PlaybackEvent(
                version=state.version,
                payload=read_state(state),
            ).model_dump(mode="json")
            await playback_ws_manager.publish(room_owner_id, event)
    except WebSocketDisconnect:
        playback_ws_manager.disconnect(websocket, room_owner_id)
    except Exception as exc:
        playback_ws_manager.disconnect(websocket, room_owner_id)
        try:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=str(exc))
        except Exception:
            pass
