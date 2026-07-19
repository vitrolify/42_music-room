import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invite import Invite, InviteStatus
from app.models.playlist import Playlist
from app.services import invite_service


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


async def user_has_playlist_permission(
    db: AsyncSession, user_id: uuid.UUID, playlist: Playlist, action: str = "read"
) -> bool:
    is_owner = playlist.owner_id == user_id
    if is_owner:
        return True

    needs_invite = False

    if not playlist.public:
        needs_invite = True
    elif action == "edit" and playlist.invited_only_edit:
        needs_invite = True

    if needs_invite:
        has_invite = await invite_service.check_user_has_accepted_invite(
            db=db, user_id=user_id, playlist_id=playlist.id
        )
        return has_invite

    return True


async def lock_playlist(db: AsyncSession, playlist_id: int) -> None:
    """Acquire a row-level lock on the playlist to serialize concurrent moves."""
    await db.execute(
        select(Playlist.id).where(Playlist.id == playlist_id).with_for_update()
    )
