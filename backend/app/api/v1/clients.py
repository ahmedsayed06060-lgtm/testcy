import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ManagerUser
from app.database import get_db
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientInput
from app.schemas.common import Pagination, success

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("")
async def list_clients(
    user: User = ManagerUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
) -> dict[str, Any]:
    conditions = [Client.deleted_at.is_(None)]
    if search:
        conditions.append(Client.company_name.ilike(f"%{search}%"))
    total = await db.scalar(select(func.count(Client.id)).where(*conditions)) or 0
    records = (
        await db.scalars(
            select(Client)
            .where(*conditions)
            .order_by(Client.company_name)
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return success(
        list(records),
        Pagination(page=page, limit=limit, total=total, pages=(total + limit - 1) // limit),
    )


@router.post("", status_code=201)
async def create_client(
    payload: ClientInput, user: User = ManagerUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    record = Client(**payload.model_dump())
    db.add(record)
    await db.commit()
    return success(record)


@router.get("/{client_id}")
async def get_client(
    client_id: uuid.UUID, user: User = ManagerUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    record = await db.scalar(
        select(Client).where(Client.id == client_id, Client.deleted_at.is_(None))
    )
    if not record:
        raise HTTPException(404, "Client not found")
    return success(record)


@router.put("/{client_id}")
async def update_client(
    client_id: uuid.UUID,
    payload: ClientInput,
    user: User = ManagerUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    record = await get_client(client_id, user, db)
    client = record["data"]
    for key, value in payload.model_dump().items():
        setattr(client, key, value)
    await db.commit()
    return success(client)


@router.delete("/{client_id}")
async def delete_client(
    client_id: uuid.UUID, user: User = ManagerUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    record = await get_client(client_id, user, db)
    client = record["data"]
    client.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return success({"deleted": True})
