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


async def get_invites_for_user(db: AsyncSession, user_id: uuid.UUID) -> list[Invite]:
    result = await db.execute(
        select(Invite).where(Invite.user_id == user_id)
    )
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


async def check_user_has_accepted_invite(
    db: AsyncSession, user_id: uuid.UUID, playlist_id: int
) -> bool:
    query = select(Invite).where(
        Invite.playlist_id == playlist_id,
        Invite.user_id == user_id,
        Invite.status == InviteStatus.ACCEPTED,
    )
    result = await db.execute(query)
    return result.scalar_one_or_none() is not None
