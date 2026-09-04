import uuid
from typing import Sequence

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device, DeviceDelegation


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


async def update_device_name(
    db: AsyncSession, device_id: uuid.UUID, user_id: uuid.UUID, new_name: str
) -> Device | None:
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()

    if not device or device.owner_id != user_id:
        return None

    device.name = new_name
    await db.commit()
    await db.refresh(device)

    return device


async def grant_device_access(
    db: AsyncSession, device_id: uuid.UUID, owner_id: uuid.UUID, delegate_id: uuid.UUID
) -> DeviceDelegation | None:
    # Verify the requester actually owns this device
    device_result = await db.execute(
        select(Device).where(Device.id == device_id, Device.owner_id == owner_id)
    )
    if not device_result.scalar_one_or_none():
        return None

    delegation = DeviceDelegation(device_id=device_id, delegate_user_id=delegate_id)
    db.add(delegation)

    try:
        await db.commit()
        await db.refresh(delegation)
        return delegation
    except IntegrityError:
        await db.rollback()
        # If the delegation already exists, gracefully return the existing record
        existing = await db.execute(
            select(DeviceDelegation).where(
                DeviceDelegation.device_id == device_id,
                DeviceDelegation.delegate_user_id == delegate_id,
            )
        )
        return existing.scalar_one()


async def revoke_device_access(
    db: AsyncSession, device_id: uuid.UUID, owner_id: uuid.UUID, delegate_id: uuid.UUID
) -> bool:
    # Verify ownership before allowing deletion
    device_result = await db.execute(
        select(Device).where(Device.id == device_id, Device.owner_id == owner_id)
    )
    if not device_result.scalar_one_or_none():
        return False

    result = await db.execute(
        delete(DeviceDelegation).where(
            DeviceDelegation.device_id == device_id,
            DeviceDelegation.delegate_user_id == delegate_id,
        )
    )
    await db.commit()
    return result.rowcount > 0


async def list_device_delegates(
    db: AsyncSession, device_id: uuid.UUID, owner_id: uuid.UUID
) -> Sequence[DeviceDelegation] | None:
    device_result = await db.execute(
        select(Device).where(Device.id == device_id, Device.owner_id == owner_id)
    )
    if not device_result.scalar_one_or_none():
        return None

    result = await db.execute(
        select(DeviceDelegation).where(DeviceDelegation.device_id == device_id)
    )
    return result.scalars().all()
