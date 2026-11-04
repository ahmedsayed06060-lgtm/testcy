from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import (
    LoginRequest,
    MFAVerifyRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    TempTokenRequest,
)
from app.schemas.common import success
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    return success(await auth_service.login(db, str(payload.email), payload.password))


@router.post("/mfa/setup")
async def mfa_setup(
    payload: TempTokenRequest, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    return success(await auth_service.begin_mfa_setup(db, payload.temp_token))


@router.post("/mfa/setup/confirm")
async def mfa_confirm(
    payload: MFAVerifyRequest, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    await auth_service.confirm_mfa_setup(db, payload.temp_token, payload.totp_code)
    return success({"confirmed": True})


@router.post("/mfa/verify")
async def mfa_verify(
    payload: MFAVerifyRequest, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    return success(await auth_service.verify_mfa(db, payload.temp_token, payload.totp_code))


@router.post("/token/refresh")
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    return success(await auth_service.rotate_refresh_token(db, payload.refresh_token))


@router.post("/logout")
async def logout(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    await auth_service.logout(db, payload.refresh_token)
    return success({"logged_out": True})


@router.post("/password/reset")
async def password_reset(
    payload: PasswordResetRequest, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    await auth_service.request_password_reset(db, str(payload.email))
    return success({"message": "If the account exists, reset instructions have been sent"})


@router.post("/password/reset/confirm")
async def password_reset_confirm(
    payload: PasswordResetConfirm, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    await auth_service.reset_password(db, payload.token, payload.new_password)
    return success({"password_changed": True})
