import uuid

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.playlist_track import PlaylistTrack, TrackPlaybackStatus
from app.models.user_playback_state import PlaybackStatus, UserPlaybackState
from app.schemas.playback import PlaybackCommand
from app.services.device_service import has_device_delegation, user_owns_device
from app.services.playlist_service import get_playlist_by_id, lock_playlist
from app.services.playlist_track_service import (
    get_playing_track_by_id,
    get_track_by_position,
    set_track_zero_to,
    shift_queue_up,
)


async def get_state(db: AsyncSession, user_id: uuid.UUID) -> UserPlaybackState | None:
    return await db.get(UserPlaybackState, user_id)


async def apply_command(
    db: AsyncSession,
    user_id: uuid.UUID,
    command: PlaybackCommand,
    session_id: str | None,
) -> UserPlaybackState:
    if command.device_id and not await user_owns_device(db, command.device_id, user_id):
        raise PermissionError("device_id is not registered to this user")
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
        select(UserPlaybackState)
        .where(UserPlaybackState.user_id == user_id)
        .with_for_update()
    )
    state = result.scalar_one()

    if (
        command.expected_version is not None
        and command.expected_version != state.version
    ):
        raise ValueError("Stale playback state")

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
        state.status = (
            PlaybackStatus.PLAYING
            if command.command == "play"
            else PlaybackStatus.PAUSED
        )
        if command.position_seconds is not None:
            state.position_seconds = command.position_seconds
    elif command.command in ("seek", "checkpoint"):
        if not state.video_id and not command.video_id:
            raise ValueError("No video is loaded")
        if command.video_id:
            state.video_id = command.video_id
        if command.position_seconds is None:
            raise ValueError("position_seconds is required")
        if (
            command.command == "checkpoint"
            and state.controller_session_id != (session_id or command.session_id)
        ):
            raise ValueError("Only the current controller may send checkpoints")
        state.position_seconds = command.position_seconds
        if command.duration_seconds is not None:
            state.duration_seconds = command.duration_seconds

    state.version += 1
    if command.command != "checkpoint":
        state.controller_session_id = session_id or command.session_id
        if command.device_id:
            state.controller_device_id = command.device_id
    await db.commit()
    await db.refresh(state)
    return state


async def synchronize_playlist_track(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID,
    playlist_id: int,
    track: PlaylistTrack | None,
    status: PlaybackStatus,
    controller_device_id: uuid.UUID | None = None,
    controller_session_id: str | None = None,
) -> UserPlaybackState:
    """Update the owner's single playback snapshot inside the queue transaction.

    The caller must already hold the playlist lock; this function additionally locks
    the owner's state row so a second playlist cannot become active concurrently.
    """
    await db.execute(
        insert(UserPlaybackState)
        .values(user_id=owner_id, video_id="", status=PlaybackStatus.PAUSED,
                position_seconds=0, duration_seconds=0, version=0)
        .on_conflict_do_nothing(index_elements=[UserPlaybackState.user_id])
    )
    state = (
        await db.execute(
            select(UserPlaybackState)
            .where(UserPlaybackState.user_id == owner_id)
            .with_for_update()
        )
    ).scalar_one()

    if (
        status == PlaybackStatus.PLAYING
        and state.active_playlist_id not in (None, playlist_id)
    ):
        await db.execute(
            update(PlaylistTrack)
            .where(
                PlaylistTrack.playlist_id == state.active_playlist_id,
                PlaylistTrack.position == 0,
            )
            .values(status=TrackPlaybackStatus.paused)
        )

    state.active_playlist_id = playlist_id
    state.active_playlist_track_id = track.id if track else None
    state.status = status
    if track:
        state.video_id = track.track_info_id
        # The client can replace this best-effort value with YouTube's duration.
        state.duration_seconds = 0
        state.position_seconds = 0
    if controller_device_id:
        state.controller_device_id = controller_device_id
    if controller_session_id:
        state.controller_session_id = controller_session_id
    state.version += 1
    return state


async def apply_playlist_command(
    db: AsyncSession,
    *,
    playlist_id: int,
    actor_id: uuid.UUID,
    command: str,
    playlist_track_id: int,
    device_id: uuid.UUID,
    session_id: str,
    expected_version: int | None = None,
    position_seconds: float | None = None,
    duration_seconds: float | None = None,
) -> tuple[UserPlaybackState, PlaylistTrack | None]:
    """Apply a playlist command and its owner snapshot as one transaction.

    This is deliberately the sole queue/playback transition primitive.  Redis is
    used after commit for fan-out only; it is never consulted for authority.
    """
    if not await user_owns_device(db, device_id, actor_id):
        raise PermissionError("device_id is not registered to this user")
    playlist = await get_playlist_by_id(db, playlist_id)
    if not playlist:
        raise ValueError("Playlist not found")

    await lock_playlist(db, playlist_id)
    await db.execute(
        insert(UserPlaybackState)
        .values(user_id=playlist.owner_id, video_id="", status=PlaybackStatus.PAUSED,
                position_seconds=0, duration_seconds=0, version=0)
        .on_conflict_do_nothing(index_elements=[UserPlaybackState.user_id])
    )
    state = (
        await db.execute(
            select(UserPlaybackState)
            .where(UserPlaybackState.user_id == playlist.owner_id)
            .with_for_update()
        )
    ).scalar_one()
    if expected_version is not None and expected_version != state.version:
        raise ValueError("Stale playback state")

    is_owner = actor_id == playlist.owner_id
    if not is_owner:
        if (
            state.active_playlist_id != playlist_id
            or not state.controller_device_id
            or not await has_device_delegation(db, state.controller_device_id, actor_id)
        ):
            raise PermissionError("You do not have control permission for this device")

    current = await get_playing_track_by_id(db, playlist_id, playlist_track_id)
    if not current:
        raise ValueError("Track is no longer at position zero")

    controller_only = command in {"checkpoint", "ended"}
    if controller_only and (
        not is_owner
        or state.controller_device_id != device_id
        or state.controller_session_id != session_id
        or state.active_playlist_id != playlist_id
        or state.active_playlist_track_id != playlist_track_id
    ):
        raise PermissionError("Only the current controller may report progress or end")

    if command == "play":
        # A switch pauses the old position-zero track before making this queue active.
        if state.active_playlist_id not in (None, playlist_id):
            await db.execute(
                update(PlaylistTrack)
                .where(PlaylistTrack.playlist_id == state.active_playlist_id,
                       PlaylistTrack.position == 0)
                .values(status=TrackPlaybackStatus.paused)
            )
        current.status = TrackPlaybackStatus.playing
        state.active_playlist_id = playlist_id
        state.active_playlist_track_id = current.id
        state.video_id = current.track_info_id
        state.position_seconds = position_seconds or 0
        state.duration_seconds = duration_seconds or 0
        state.status = PlaybackStatus.PLAYING
        if is_owner:
            state.controller_device_id = device_id
            state.controller_session_id = session_id
    elif command == "pause":
        current.status = TrackPlaybackStatus.paused
        state.active_playlist_id = playlist_id
        state.active_playlist_track_id = current.id
        state.status = PlaybackStatus.PAUSED
    elif command in {"seek", "checkpoint"}:
        if position_seconds is None:
            raise ValueError("position_seconds is required")
        state.position_seconds = position_seconds
        if duration_seconds is not None:
            state.duration_seconds = duration_seconds
    elif command in {"skip", "ended"}:
        await db.delete(current)
        await db.flush()
        await shift_queue_up(db, playlist_id)
        next_track = await get_track_by_position(db, playlist_id, 0)
        if next_track:
            await set_track_zero_to(TrackPlaybackStatus.playing, db, playlist_id)
            state.active_playlist_id = playlist_id
            state.active_playlist_track_id = next_track.id
            state.video_id = next_track.track_info_id
            state.position_seconds = 0
            state.duration_seconds = 0
            state.status = PlaybackStatus.PLAYING
        else:
            # Keep media metadata and active playlist so terminal mini-player survives.
            state.active_playlist_id = playlist_id
            state.active_playlist_track_id = None
            state.status = PlaybackStatus.PAUSED
        current = next_track
    else:
        raise ValueError("Unsupported playlist command")

    state.version += 1
    await db.commit()
    await db.refresh(state)
    return state, current
