import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.api.deps import AdminUser, CurrentUser
from app.database import get_db
from app.models.user import Role, User, UserSession
from app.schemas.auth import PasswordChange
from app.schemas.common import Pagination, success
from app.schemas.user import ProfileUpdate, UserCreate, UserUpdate
from app.security.passwords import hash_password, validate_password, verify_password
from app.services.audit_service import record_audit

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def me(user: User = CurrentUser) -> dict[str, Any]:
    return success(user)


@router.put("/me")
async def update_me(
    payload: ProfileUpdate, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    user.full_name = payload.full_name
    await db.commit()
    return success(user)


@router.put("/me/password")
async def change_password(
    payload: PasswordChange, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    validate_password(payload.new_password, user.email)
    user.password_hash = hash_password(payload.new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    await db.commit()
    return success({"password_changed": True})


@router.get("/me/sessions")
async def sessions(user: User = CurrentUser, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    records = (
        await db.scalars(
            select(UserSession)
            .where(UserSession.user_id == user.id, UserSession.revoked.is_(False))
            .order_by(UserSession.created_at.desc())
        )
    ).all()
    return success(list(records))


@router.delete("/me/sessions/{session_id}")
async def revoke_session(
    session_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    session = await db.get(UserSession, session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(404, "Session not found")
    session.revoked = True
    await db.commit()
    return success({"revoked": True})


@router.get("")
async def list_users(
    user: User = AdminUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    role: Role | None = None,
    search: str | None = Query(None, max_length=100),
) -> dict[str, Any]:
    conditions: list[ColumnElement[bool]] = [User.deleted_at.is_(None)]
    if role:
        conditions.append(User.role == role)
    if search:
        conditions.append(or_(User.email.ilike(f"%{search}%"), User.full_name.ilike(f"%{search}%")))
    total = await db.scalar(select(func.count(User.id)).where(*conditions)) or 0
    records = (
        await db.scalars(
            select(User)
            .where(*conditions)
            .order_by(User.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return success(
        list(records),
        Pagination(page=page, limit=limit, total=total, pages=(total + limit - 1) // limit),
    )


@router.post("", status_code=201)
async def create_user(
    payload: UserCreate, user: User = AdminUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    email = str(payload.email).casefold()
    if await db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(409, "Email is already registered")
    if payload.role == Role.CLIENT and payload.client_id is None:
        raise HTTPException(422, "Client users require a client_id")
    validate_password(payload.password, email)
    record = User(
        email=email,
        full_name=payload.full_name,
        role=payload.role,
        client_id=payload.client_id,
        password_hash=hash_password(payload.password),
    )
    db.add(record)
    await db.flush()
    await record_audit(
        db, action="user.created", resource_type="user", resource_id=record.id, user_id=user.id
    )
    await db.commit()
    return success(record)


@router.get("/{user_id}")
async def get_user(
    user_id: uuid.UUID, user: User = AdminUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    record = await db.scalar(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    if not record:
        raise HTTPException(404, "User not found")
    return success(record)


@router.put("/{user_id}")
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    user: User = AdminUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    record = await db.get(User, user_id)
    if not record or record.deleted_at:
        raise HTTPException(404, "User not found")
    for key, value in payload.model_dump().items():
        setattr(record, key, value)
    await db.commit()
    return success(record)


@router.delete("/{user_id}")
async def delete_user(
    user_id: uuid.UUID, user: User = AdminUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    if user_id == user.id:
        raise HTTPException(409, "You cannot delete your own account")
    record = await db.get(User, user_id)
    if not record:
        raise HTTPException(404, "User not found")
    record.deleted_at = datetime.now(timezone.utc)
    record.is_active = False
    await db.commit()
    return success({"deleted": True})
