import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_queue import EventQueue
from app.models.playlist import Playlist
from app.models.playlist_track import PlaylistTrack, TrackPlaybackStatus

logger = logging.getLogger(__name__)


async def process_add_track_event(
    db: AsyncSession, event: EventQueue, playlist_id: int
) -> None:
    """
    Processes the 'add' event by calculating the next available position in the queue.
    """
    try:
        # Find the current highest position in the playlist queue
        await _lock_playlist(db, playlist_id)
        next_position = await _get_next_position(db, playlist_id)
        await _insert_track(db, event, playlist_id, next_position)
        await db.commit()
        return
    except Exception as e:
        await db.rollback()
        logger.error(
            {
                "event": "worker_add_failed",
                "reason": "database_error",
                "event_id": event.id,
                "error": str(e),
            }
        )


async def _lock_playlist(db: AsyncSession, playlist_id: int) -> None:
    """Acquire a row-level lock on the playlist to serialize concurrent moves."""
    await db.execute(
        select(Playlist.id).where(Playlist.id == playlist_id).with_for_update()
    )


async def _get_next_position(db: AsyncSession, playlist_id: int) -> int:
    """Return the next available position (current max + 1) in the playlist."""
    query = select(func.max(PlaylistTrack.position)).where(
        PlaylistTrack.playlist_id == playlist_id
    )
    result = await db.execute(query)
    current_max = result.scalar() or 0
    return current_max + 1


async def _insert_track(
    db: AsyncSession, event: EventQueue, playlist_id: int, position: int
) -> None:
    """Construct and commit a new PlaylistTrack at the given position."""
    new_track = PlaylistTrack(
        playlist_id=playlist_id,
        track_info_id=event.track_info_id,
        user_id=event.user_id,
        position=position,
        status=TrackPlaybackStatus.queued,
    )
    db.add(new_track)
    logger.info(
        {
            "event": "worker_track_added",
            "event_id": event.id,
            "playlist_id": playlist_id,
            "track_info_id": event.track_info_id,
            "position": position,
            "status": "success",
        }
    )
