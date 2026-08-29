import uuid

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_playback_state import PlaybackStatus, UserPlaybackState
from app.schemas.playback import PlaybackCommand


async def get_state(db: AsyncSession, user_id: uuid.UUID) -> UserPlaybackState | None:
    return await db.get(UserPlaybackState, user_id)


async def apply_command(
    db: AsyncSession, user_id: uuid.UUID, command: PlaybackCommand, session_id: str | None
) -> UserPlaybackState:
    # Materialize the row first so concurrent commands serialize on the same user row.
    await db.execute(
        insert(UserPlaybackState)
        .values(
            user_id=user_id, video_id="", status=PlaybackStatus.PAUSED,
            position_seconds=0, duration_seconds=0, version=0,
        )
        .on_conflict_do_nothing(index_elements=[UserPlaybackState.user_id])
    )
    result = await db.execute(
        select(UserPlaybackState).where(UserPlaybackState.user_id == user_id).with_for_update()
    )
    state = result.scalar_one()

    if command.command == "load":
        if not command.video_id:
            raise ValueError("video_id is required for load")
        state.video_id = command.video_id
        state.position_seconds = command.position_seconds or 0
        state.duration_seconds = command.duration_seconds or 0
        state.status = PlaybackStatus.PAUSED
    elif command.command in ("play", "pause"):
        if not state.video_id:
            raise ValueError("No video is loaded")
        state.status = PlaybackStatus.PLAYING if command.command == "play" else PlaybackStatus.PAUSED
        if command.position_seconds is not None:
            state.position_seconds = command.position_seconds
    elif command.command in ("seek", "checkpoint"):
        if not state.video_id and not command.video_id:
            raise ValueError("No video is loaded")
        if command.video_id:
            state.video_id = command.video_id
        if command.position_seconds is None:
            raise ValueError("position_seconds is required")
        state.position_seconds = command.position_seconds
        if command.duration_seconds is not None:
            state.duration_seconds = command.duration_seconds
        if command.command == "seek" and command.session_id:
            state.controller_session_id = command.session_id

    state.version += 1
    if command.command != "checkpoint":
        state.controller_session_id = session_id or command.session_id
    await db.commit()
    await db.refresh(state)
    return state
