import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.track_info import TrackInfo
from app.services.youtube_service import fetch_youtube_video_info

logger = logging.getLogger(__name__)


async def get_or_update_track_info(db: AsyncSession, video_id: str) -> TrackInfo:
    """
    Cache-Aside Pattern:
    Searches for the video on the local DB. If it doesn't exist or isn't
    updated for more than 7 days it fetches the video on the youtube API and
    saves it
    """
    stmt = select(TrackInfo).where(TrackInfo.id == video_id)
    result = await db.execute(stmt)
    track_info = result.scalar_one_or_none()

    needs_update = False

    if not track_info:
        needs_update = True
    else:
        age = datetime.now(timezone.utc) - track_info.updated_at.replace(
            tzinfo=timezone.utc
        )
        if age > timedelta(days=7):
            needs_update = True

    if needs_update:
        try:
            yt_data = await fetch_youtube_video_info(video_id)

            if not track_info:
                track_info = TrackInfo(
                    id=video_id,
                    title=yt_data["title"],
                    channel_title=yt_data["channel_title"],
                    thumbnail_url=yt_data["thumbnail_url"],
                    duration_seconds=yt_data["duration_seconds"],
                )
                db.add(track_info)
            else:
                track_info.title = yt_data["title"]
                track_info.channel_title = yt_data["channel_title"]
                track_info.thumbnail_url = yt_data["thumbnail_url"]
                track_info.duration_seconds = yt_data["duration_seconds"]
            await db.flush()
        except Exception as e:
            logger.error(
                {
                    "event": "youtube_api_fetch_failed",
                    "video_id": video_id,
                    "error": str(e),
                }
            )

            if not track_info:
                raise ValueError(f"Unable to obtain data for the video {video_id}")

    return track_info
