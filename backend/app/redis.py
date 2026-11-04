"""Shared Redis connection and non-sensitive pub/sub helpers."""

import json
from typing import Any

import redis.asyncio as redis

from app.config import settings

redis_client = redis.from_url(settings.redis_url, decode_responses=True)


async def publish_user_notification(user_id: str, event: dict[str, Any]) -> None:
    await redis_client.publish(f"notifications:{user_id}", json.dumps(event, default=str))


async def close_redis() -> None:
    await redis_client.aclose()
