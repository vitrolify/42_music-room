from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.playlist_track import PlaylistTrack


async def get_tracks_by_playlist(
    db: AsyncSession, playlist_id: int
) -> list[PlaylistTrack]:
    query = (
        select(PlaylistTrack)
        .where(PlaylistTrack.playlist_id == playlist_id)
        .order_by(PlaylistTrack.position.asc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())
