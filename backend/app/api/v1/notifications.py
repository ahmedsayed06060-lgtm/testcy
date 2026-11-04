import secrets
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.redis import redis_client
from app.schemas.common import success

router = APIRouter(prefix="/notifications", tags=["notifications"])
ws_router = APIRouter()


@router.get("")
async def list_notifications(
    unread_only: bool = False, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    conditions = [Notification.user_id == user.id]
    if unread_only:
        conditions.append(Notification.read.is_(False))
    records = (
        await db.scalars(
            select(Notification)
            .where(*conditions)
            .order_by(Notification.created_at.desc())
            .limit(100)
        )
    ).all()
    return success(list(records))


@router.put("/read-all")
async def read_all(user: User = CurrentUser, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    await db.execute(update(Notification).where(Notification.user_id == user.id).values(read=True))
    await db.commit()
    return success({"read": True})


@router.put("/{notification_id}/read")
async def read_notification(
    notification_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    notification = await db.get(Notification, notification_id)
    if not notification or notification.user_id != user.id:
        raise HTTPException(404, "Notification not found")
    notification.read = True
    await db.commit()
    return success(notification)


@router.post("/ws-ticket")
async def websocket_ticket(user: User = CurrentUser) -> dict[str, Any]:
    ticket = secrets.token_urlsafe(32)
    await redis_client.set(f"ws-ticket:{ticket}", str(user.id), ex=30)
    return success({"ticket": ticket, "expires_in": 30})


@ws_router.websocket("/ws/notifications")
async def notifications_socket(websocket: WebSocket) -> None:
    ticket = websocket.query_params.get("ticket", "")
    user_id = await redis_client.getdel(f"ws-ticket:{ticket}") if ticket else None
    if not user_id:
        await websocket.close(code=4401, reason="Invalid or expired single-use ticket")
        return
    await websocket.accept()
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"notifications:{user_id}")
    try:
        await websocket.send_json({"type": "connected"})
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=25)
            if message and message.get("type") == "message":
                await websocket.send_text(message["data"])
            else:
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"notifications:{user_id}")
        await pubsub.aclose()
