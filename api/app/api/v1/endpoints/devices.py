import uuid
from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.error_handlers import BaseVitrolifyException
from app.auth.dependencies import get_current_user_id
from app.db.session import get_db
from app.schemas.device import DeviceCreate, DeviceRead
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
            error_code="Invalid device deletion attempted.",
            message="Device not found or access denied.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
