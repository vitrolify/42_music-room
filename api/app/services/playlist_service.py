import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invite import Invite, InviteStatus
from app.models.playlist import Playlist


async def create_playlist(
    db: AsyncSession,
    name: str,
    owner_id: uuid.UUID,
    public: bool,
    invited_only_edit: bool,
) -> Playlist:
    playlist = Playlist(
        name=name,
        owner_id=owner_id,
        public=public,
        invited_only_edit=invited_only_edit,
    )
    db.add(playlist)
    await db.commit()
    await db.refresh(playlist)
    return playlist


async def get_user_playlists(db: AsyncSession, user_id: uuid.UUID) -> list[Playlist]:
    invited = select(Invite.playlist_id).where(
        Invite.user_id == user_id,
        Invite.status == InviteStatus.ACCEPTED,
    )
    query = select(Playlist).where(
        Playlist.public.is_(True)
        | (Playlist.owner_id == user_id)
        | Playlist.id.in_(invited)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_playlist_by_id(db: AsyncSession, playlist_id: int) -> Playlist | None:
    return await db.get(Playlist, playlist_id)


async def update_playlist(
    db: AsyncSession, playlist: Playlist, update_data: dict
) -> Playlist:
    for field, value in update_data.items():
        setattr(playlist, field, value)

    await db.commit()
    await db.refresh(playlist)
    return playlist


async def delete_playlist(db: AsyncSession, playlist: Playlist) -> None:
    await db.delete(playlist)
    await db.commit()
