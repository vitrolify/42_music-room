from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.playlist_track import PlaylistTrack, TrackPlaybackStatus


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


async def get_playing_track_by_id(
    db: AsyncSession, playlist_id: int, playlist_track_id: int
) -> PlaylistTrack | None:
    stmt = select(PlaylistTrack).where(
        PlaylistTrack.id == playlist_track_id,
        PlaylistTrack.playlist_id == playlist_id,
        PlaylistTrack.position == 0,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def shift_queue_up(db: AsyncSession, playlist_id: int) -> None:
    stmt = (
        update(PlaylistTrack)
        .where(PlaylistTrack.playlist_id == playlist_id, PlaylistTrack.position > 0)
        .values(position=PlaylistTrack.position - 1)
    )
    await db.execute(stmt)


async def set_track_zero_to(
    status: TrackPlaybackStatus, db: AsyncSession, playlist_id: int
) -> None:
    stmt = (
        update(PlaylistTrack)
        .where(PlaylistTrack.playlist_id == playlist_id, PlaylistTrack.position == 0)
        .values(status=status)
    )
    await db.execute(stmt)


async def get_track_by_position(
    db: AsyncSession, playlist_id: int, position: int
) -> PlaylistTrack | None:
    """
    Busca uma música na fila em uma posição específica de forma genérica.
    """
    stmt = select(PlaylistTrack).where(
        PlaylistTrack.playlist_id == playlist_id, PlaylistTrack.position == position
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
