"""Async SQLAlchemy engine and request-scoped session lifecycle."""

from collections.abc import AsyncIterator

from sqlalchemy import event, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session

from app.config import settings

pool_options = (
    {}
    if settings.database_url.startswith("sqlite")
    else {
        "pool_size": 10,
        "max_overflow": 20,
    }
)
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    echo=False,
    **pool_options,
)
SessionFactory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@event.listens_for(Session, "after_begin")
def _apply_rls_context(session: Session, _: object, connection: Connection) -> None:
    """Reapply tenant claims on every transaction, including after a commit."""
    if connection.dialect.name != "postgresql":
        return
    internal = session.info.get("rls_internal", True)
    client_id = session.info.get("rls_client_id", "")
    connection.execute(
        text(
            "SELECT set_config('app.is_admin', :internal, true), "
            "set_config('app.client_id', :client_id, true)"
        ),
        {"internal": "on" if internal else "off", "client_id": str(client_id)},
    )


async def set_request_rls_context(db: AsyncSession, user: object) -> None:
    """Restrict client sessions; internal roles retain service-level authorization."""
    from app.models.user import Role, User

    if not isinstance(user, User) or db.get_bind().dialect.name != "postgresql":
        return
    internal = user.role != Role.CLIENT
    client_id = str(user.client_id or "")
    db.sync_session.info["rls_internal"] = internal
    db.sync_session.info["rls_client_id"] = client_id
    await db.execute(
        text(
            "SELECT set_config('app.is_admin', :internal, true), "
            "set_config('app.client_id', :client_id, true)"
        ),
        {"internal": "on" if internal else "off", "client_id": client_id},
    )


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionFactory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
