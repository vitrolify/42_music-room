import time

import redis.asyncio as redis

from app.core.config import settings

redis_client = redis.from_url(settings.redis_url, decode_responses=True)

# Assuming you have your async redis client imported as `redis_client`
REDIS_TTL = (
    3600  # 1 hour safety fallback in case a server crashes without disconnecting
)


async def close_redis():
    await redis_client.aclose()


async def set_active_device(playlist_id: int, device_id: str):
    redis_key = f"playlist:{playlist_id}:active_device"
    await redis_client.set(redis_key, device_id, ex=REDIS_TTL)


async def get_active_device(playlist_id: int) -> str | None:
    redis_key = f"playlist:{playlist_id}:active_device"
    val = await redis_client.get(redis_key)

    if isinstance(val, bytes):
        return val.decode("utf-8")
    return val


async def clear_active_device(playlist_id: int, device_id: str):
    redis_key = f"playlist:{playlist_id}:active_device"
    current_device = await redis_client.get(redis_key)

    if isinstance(current_device, bytes):
        current_device = current_device.decode("utf-8")

    if current_device and current_device == device_id:
        await redis_client.delete(redis_key)


async def revoke_user_sessions(firebase_uid: str) -> None:
    """Marks all tokens issued before now as revoked for this user."""
    now = int(time.time())
    redis_key = f"auth:revoked_at:{firebase_uid}"
    await redis_client.set(redis_key, str(now), ex=REDIS_TTL)


async def is_token_revoked(firebase_uid: str, token_iat: int | None) -> bool:
    """Checks whether the token was issued before the user's last revocation event."""
    if token_iat is None:
        return False
    redis_key = f"auth:revoked_at:{firebase_uid}"
    revoked_at = await redis_client.get(redis_key)
    if revoked_at is None:
        return False
    return token_iat < int(revoked_at)
