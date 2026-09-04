import uuid
from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.error_handlers import BaseVitrolifyException
from app.auth.dependencies import get_current_user_id
from app.db.session import get_db
from app.schemas.device import (
    DeviceCreate,
    DeviceDelegationCreate,
    DeviceDelegationRead,
    DeviceRead,
    DeviceUpdate,
)
from app.services import device_service

router = APIRouter(tags=["devices"], prefix="/devices")


@router.post(
    "/",
    response_model=DeviceRead,
    status_code=status.HTTP_200_OK,
    summary="Auto-register a client device",
)
async def auto_register_device(
    payload: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    device = await device_service.register_device(
        db=db,
        device_id=payload.id,
        user_id=user_id,
        name=payload.name,
    )
    return device


@router.get(
    "/",
    response_model=List[DeviceRead],
    status_code=status.HTTP_200_OK,
    summary="List all devices registered to the current user",
)
async def list_user_devices(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    return await device_service.get_user_devices(db=db, user_id=user_id)


@router.delete(
    "/{device_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a registered device",
)
async def remove_device(
    device_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    success = await device_service.delete_device(
        db=db, device_id=device_id, user_id=user_id
    )
    if not success:
        raise BaseVitrolifyException(
            error_code="INVALID_DEVICE_DELETION",
            message="Device not found or access denied.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/{device_id}",
    response_model=DeviceRead,
    status_code=status.HTTP_200_OK,
    summary="Update a device's name",
)
async def rename_device(
    device_id: uuid.UUID,
    payload: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    updated_device = await device_service.update_device_name(
        db=db, device_id=device_id, user_id=user_id, new_name=payload.name
    )

    if not updated_device:
        raise BaseVitrolifyException(
            error_code="INVALID_DEVICE_RENAME",
            message="Device not found or access denied.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    return updated_device


@router.post(
    "/{device_id}/delegates",
    response_model=DeviceDelegationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Grant a friend control over this device",
)
async def add_device_delegate(
    device_id: uuid.UUID,
    payload: DeviceDelegationCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    if user_id == payload.delegate_user_id:
        raise BaseVitrolifyException(
            error_code="SELF_DEVICE_DELEGATION",
            message="You already have full control over your own device.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    delegation = await device_service.grant_device_access(
        db=db,
        device_id=device_id,
        owner_id=user_id,
        delegate_id=payload.delegate_user_id,
    )
    if not delegation:
        raise BaseVitrolifyException(
            error_code="INVALID_DEVICE_DELEGATION",
            message="Device not found or access denied.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return delegation


@router.delete(
    "/{device_id}/delegates/{delegate_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke a friend's control over this device",
)
async def remove_device_delegate(
    device_id: uuid.UUID,
    delegate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    success = await device_service.revoke_device_access(
        db=db, device_id=device_id, owner_id=user_id, delegate_id=delegate_id
    )
    if not success:
        raise BaseVitrolifyException(
            error_code="INVALID_DEVICE_DELEGATION_REMOVAL",
            message="Device not found, or delegate does not exist.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{device_id}/delegates",
    response_model=List[DeviceDelegationRead],
    status_code=status.HTTP_200_OK,
    summary="List all users with control over this device",
)
async def get_device_delegates(
    device_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    delegates = await device_service.list_device_delegates(
        db=db, device_id=device_id, owner_id=user_id
    )
    if delegates is None:
        raise BaseVitrolifyException(
            error_code="DEVICE_NOT_FOUND",
            message="Device not found or access denied.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return delegates
