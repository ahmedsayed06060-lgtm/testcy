# ruff: noqa: S608 -- DDL identifiers are selected exclusively from fixed allowlists.
"""Initial CyberOps Hub schema, immutable audit, FTS, and tenant RLS.

Revision ID: 001_initial
Revises:
"""

from collections.abc import Sequence

from alembic import op
from app.models import Base

revision: str = "001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)
    op.execute("CREATE INDEX ix_findings_search_vector ON findings USING gin(search_vector)")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION findings_search_vector_update() RETURNS trigger AS $$
        BEGIN
          NEW.search_vector := to_tsvector('english',
            coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '') || ' ' ||
            coalesce(NEW.affected_asset, '') || ' ' || coalesce(NEW.cwe_id, ''));
          RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
        CREATE TRIGGER findings_search_vector_refresh
        BEFORE INSERT OR UPDATE OF title, description, affected_asset, cwe_id ON findings
        FOR EACH ROW EXECUTE FUNCTION findings_search_vector_update();
        CREATE RULE no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
        CREATE RULE no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
        """
    )
    # RLS complements, rather than replaces, authorization checks in services.
    op.execute(
        """
        ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
        ALTER TABLE clients FORCE ROW LEVEL SECURITY;
        CREATE POLICY tenant_clients ON clients USING (
          current_setting('app.is_admin', true) = 'on' OR
          id::text = current_setting('app.client_id', true)
        );
        ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
        ALTER TABLE engagements FORCE ROW LEVEL SECURITY;
        CREATE POLICY tenant_engagements ON engagements USING (
          current_setting('app.is_admin', true) = 'on' OR
          client_id::text = current_setting('app.client_id', true)
        );
        """
    )
    for table in (
        "jobs",
        "findings",
        "reports",
        "scope_items",
        "authorization_docs",
        "social_assessments",
        "phishing_campaigns",
        "mobile_analyses",
    ):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"""CREATE POLICY tenant_{table} ON {table} USING (
              current_setting('app.is_admin', true) = 'on' OR EXISTS (
                SELECT 1 FROM engagements e WHERE e.id = {table}.engagement_id
                AND e.client_id::text = current_setting('app.client_id', true)
              ))"""
        )


def downgrade() -> None:
    op.execute("DROP RULE IF EXISTS no_delete ON audit_logs")
    op.execute("DROP RULE IF EXISTS no_update ON audit_logs")
    op.execute("DROP TRIGGER IF EXISTS findings_search_vector_refresh ON findings")
    op.execute("DROP FUNCTION IF EXISTS findings_search_vector_update")
    Base.metadata.drop_all(bind=op.get_bind(), checkfirst=True)
