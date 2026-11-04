"""Role rules shared by transport dependencies and service methods."""

from collections.abc import Iterable

from app.models.user import Role, User

STAFF_ROLES = {Role.ADMIN, Role.ENGAGEMENT_MANAGER, Role.PENTESTER, Role.ANALYST}
EDITOR_ROLES = {Role.ADMIN, Role.ENGAGEMENT_MANAGER, Role.PENTESTER}
MANAGER_ROLES = {Role.ADMIN, Role.ENGAGEMENT_MANAGER}


def has_role(user: User, allowed: Iterable[Role]) -> bool:
    return user.is_active and user.deleted_at is None and user.role in set(allowed)


def can_access_engagement(user: User, client_id: object, assigned: bool) -> bool:
    if not user.is_active or user.deleted_at is not None:
        return False
    if user.role == Role.ADMIN:
        return True
    if user.role == Role.CLIENT:
        return user.client_id == client_id
    return assigned
