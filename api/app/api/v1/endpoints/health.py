from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db


router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
    }


@router.get("/health/db")
async def database_health_check(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT 1"))

    return {
        "database": "ok",
        "result": result.scalar_one(),
    }
