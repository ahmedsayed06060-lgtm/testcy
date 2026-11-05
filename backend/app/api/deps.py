"""Authentication and role dependencies used by every protected route."""

import uuid
from collections.abc import Callable, Coroutine
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, set_request_rls_context
from app.models.user import Role, User, UserSession
from app.security.jwt import TokenType, TokenValidationError, decode_token
from app.security.rbac import has_role

bearer = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        claims = decode_token(credentials.credentials, TokenType.ACCESS)
        user_id = uuid.UUID(claims["sub"])
        session_id = uuid.UUID(claims["sid"])
    except (TokenValidationError, ValueError, KeyError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid access token") from exc
    session = await db.get(UserSession, session_id)
    if session is None or session.revoked or session.user_id != user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session has been revoked")
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session has expired")
    user = await db.get(User, user_id)
    if user is None or not user.is_active or user.deleted_at is not None or not user.mfa_enabled:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User is not active")
    await set_request_rls_context(db, user)
    return user


def require_roles(*roles: Role) -> Callable[..., Coroutine[Any, Any, User]]:
    async def role_dependency(user: User = Depends(get_current_user)) -> User:
        if not has_role(user, roles):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role permissions")
        return user

    return role_dependency


CurrentUser = Depends(get_current_user)
AdminUser = Depends(require_roles(Role.ADMIN))
ManagerUser = Depends(require_roles(Role.ADMIN, Role.ENGAGEMENT_MANAGER))
EditorUser = Depends(require_roles(Role.ADMIN, Role.ENGAGEMENT_MANAGER, Role.PENTESTER))
