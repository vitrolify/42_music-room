import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device


async def register_device(
    db: AsyncSession, device_id: uuid.UUID, user_id: uuid.UUID, name: str
) -> Device:
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()

    if device:
        return device

    new_device = Device(id=device_id, owner_id=user_id, name=name)
    db.add(new_device)
    await db.commit()
    await db.refresh(new_device)

    return new_device


async def get_user_devices(db: AsyncSession, user_id: uuid.UUID) -> Sequence[Device]:
    result = await db.execute(
        select(Device)
        .where(Device.owner_id == user_id)
        .order_by(Device.created_at.desc())
    )
    return result.scalars().all()


async def delete_device(
    db: AsyncSession, device_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()

    if not device or device.owner_id != user_id:
        return False

    await db.delete(device)
    await db.commit()
    return True
