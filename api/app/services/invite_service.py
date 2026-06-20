import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invite import Invite, InviteStatus


async def create_invite_in_db(
    db: AsyncSession, user_id: uuid.UUID, playlist_id: int
) -> Invite:
    invite = Invite(
        user_id=user_id,
        playlist_id=playlist_id,
        status=InviteStatus.PENDING,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    return invite


async def get_invites_by_playlist(db: AsyncSession, playlist_id: int) -> list[Invite]:
    result = await db.execute(select(Invite).where(Invite.playlist_id == playlist_id))
    return list(result.scalars().all())


async def get_invite_by_id(db: AsyncSession, invite_id: int) -> Invite | None:
    return await db.get(Invite, invite_id)


async def update_invite_status(
    db: AsyncSession, invite: Invite, status: InviteStatus
) -> Invite:
    invite.status = status
    await db.commit()
    await db.refresh(invite)
    return invite


async def delete_invite_in_db(db: AsyncSession, invite: Invite) -> None:
    await db.delete(invite)
    await db.commit()
