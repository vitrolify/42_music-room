import asyncio
import logging

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_queue import EventQueue
from app.models.playlist_track import PlaylistTrack, TrackPlaybackStatus

logger = logging.getLogger(__name__)


async def process_add_track_event(
    db: AsyncSession, event: EventQueue, max_retries: int = 3
) -> None:
    """
    Processes the 'add' event by calculating the next available position in the queue.
    Uses a simple retry mechanism in case of a Race Condition triggered by the
    unique constraint on (playlist_id, position).
    """
    if event.playlist_id is None:
        logger.error(
            {
                "event": "worker_processing_failed",
                "reason": "missing_playlist_id",
                "event_id": event.id,
            }
        )
        return

    for attempt in range(max_retries):
        next_position = None
        try:
            # Find the current highest position in the playlist queue
            query = select(func.max(PlaylistTrack.position)).where(
                PlaylistTrack.playlist_id == event.playlist_id
            )
            result = await db.execute(query)
            current_max = result.scalar() or 0
            next_position = current_max + 1

            # Insert new track
            new_track = PlaylistTrack(
                playlist_id=event.playlist_id,
                track_info_id=event.track_info_id,  # Placeholder for YouTube ID
                user_id=event.user_id,
                position=next_position,
                status=TrackPlaybackStatus.queued,
            )
            db.add(new_track)
            await db.commit()
            logger.info(
                {
                    "event": "worker_track_added",
                    "event_id": event.id,
                    "playlist_id": event.playlist_id,
                    "track_info_id": event.track_info_id,
                    "position": next_position,
                    "status": "success",
                }
            )
            return

        except IntegrityError:
            # Race condition happened
            await db.rollback()
            logger.warning(
                {
                    "event": "worker_position_collision",
                    "event_id": event.id,
                    "playlist_id": event.playlist_id,
                    "attempt": attempt + 1,
                    "max_retries": max_retries,
                    "target_position": next_position,
                }
            )
            # Wait to prevent locking loops
            await asyncio.sleep(0.1)

    # all retries failed
    logger.error(
        {
            "event": "worker_processing_failed",
            "reason": "max_retries_exceeded",
            "event_id": event.id,
            "playlist_id": event.playlist_id,
        }
    )
