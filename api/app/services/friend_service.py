import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.friend import FriendRequest, FriendRequestStatus
from app.models.user import User


async def create_friend_request_in_db(
    db: AsyncSession, requester_id: uuid.UUID, addressee_id: uuid.UUID
) -> FriendRequest:
    friend_request = FriendRequest(
        requester_id=requester_id,
        addressee_id=addressee_id,
        status=FriendRequestStatus.PENDING,
    )
    db.add(friend_request)
    await db.commit()
    await db.refresh(friend_request)
    return friend_request


async def get_friend_request_by_id(
    db: AsyncSession, request_id: int
) -> FriendRequest | None:
    return await db.get(FriendRequest, request_id)


async def update_friend_request_status(
    db: AsyncSession,
    friend_request: FriendRequest,
    status: FriendRequestStatus,
) -> FriendRequest:
    friend_request.status = status
    await db.commit()
    await db.refresh(friend_request)
    return friend_request


async def get_friendship(
    db: AsyncSession, user_id: uuid.UUID, other_id: uuid.UUID
) -> FriendRequest | None:
    result = await db.execute(
        select(FriendRequest).where(
            or_(
                (FriendRequest.requester_id == user_id)
                & (FriendRequest.addressee_id == other_id),
                (FriendRequest.requester_id == other_id)
                & (FriendRequest.addressee_id == user_id),
            )
        )
    )
    return result.scalar_one_or_none()


async def get_incoming_requests_for_user(
    db: AsyncSession, user_id: uuid.UUID
) -> list[tuple[FriendRequest, User]]:
    result = await db.execute(
        select(FriendRequest, User)
        .join(User, FriendRequest.requester_id == User.id)
        .where(
            FriendRequest.addressee_id == user_id,
            FriendRequest.status == FriendRequestStatus.PENDING,
        )
    )
    return list(result.all())


async def get_outgoing_requests_for_user(
    db: AsyncSession, user_id: uuid.UUID
) -> list[tuple[FriendRequest, User]]:
    result = await db.execute(
        select(FriendRequest, User)
        .join(User, FriendRequest.addressee_id == User.id)
        .where(
            FriendRequest.requester_id == user_id,
            FriendRequest.status == FriendRequestStatus.PENDING,
        )
    )
    return list(result.all())


async def get_friends_for_user(db: AsyncSession, user_id: uuid.UUID) -> list[User]:
    result = await db.execute(
        select(User)
        .join(
            FriendRequest,
            or_(
                (FriendRequest.requester_id == user_id)
                & (User.id == FriendRequest.addressee_id),
                (FriendRequest.addressee_id == user_id)
                & (User.id == FriendRequest.requester_id),
            ),
        )
        .where(FriendRequest.status == FriendRequestStatus.ACCEPTED)
    )
    return list(result.scalars().all())