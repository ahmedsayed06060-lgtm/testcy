# CyberOps Hub

A bilingual security operations platform for managing explicitly authorized engagements, scope, evidence, findings, and reports. **The server-side authorization gate fails closed and has no bypass.**

## Stack

- Next.js 16 / React 19, strict TypeScript, Tailwind CSS 4, TanStack Query, Zustand, next-intl
- FastAPI, PyJWT RS256 authentication, SQLAlchemy 2 async, PostgreSQL 16, Alembic, Celery, Redis, MinIO
- Sandboxed Nmap, testssl.sh, Nuclei, ZAP, MobSF, and public-data OSINT workers

## Quick start

```bash
cp .env.example .env
python3 backend/scripts/generate_keys.py
make dev
make migrate
make seed
```

Open `http://localhost:3000`. API documentation is at `http://localhost:8000/api/docs`.

### Web-only development

```bash
cd frontend
npm ci
npm run dev
```

Set `NEXT_PUBLIC_API_URL` to the running API's `/api/v1` URL. Operational screens use live tenant-scoped API responses; there is no demonstration-data fallback. Protected report and evidence downloads retrieve authenticated, short-lived signed URLs.

## Verification

```bash
make lint
make test
make build
```

The backend suite enforces **85% minimum statement coverage** (approximately **89%** in the verified local run) and covers authentication, tenant/RBAC boundaries, lifecycle operations, scope matching, time windows, ownership checks, sanitization, evidence, reporting, notifications, campaigns, and denial auditing. Frontend unit tests cover accessible forms, scope validation, CVSS calculation, and data tables.

CI also starts PostgreSQL 16, applies Alembic migrations, and runs live cross-tenant RLS and audit-immutability integration tests through a non-superuser role. These tests skip locally unless `POSTGRES_TEST_URL` points to a **disposable migrated database**.

For browser workflow checks:

```bash
cd frontend
npx playwright install chromium
npx playwright test
```

Playwright uses explicit route-level API contract mocks for login/MFA, RTL, dark mode, engagement creation, authorization rejection, report generation, and signed downloads. It needs no backend credentials, but these mocked checks complement rather than replace a live-stack deployment smoke test.

## Security boundary

Only use CyberOps Hub against assets for which you hold explicit written permission. Approval in the UI is never sufficient by itself: current time, assignment, exact scope, exclusions, signed authorization, and asset ownership are checked before dispatch and again by the worker. See [SECURITY.md](SECURITY.md) and [docs/security-controls.md](docs/security-controls.md).

## Documentation

- [Architecture and Mermaid diagrams](ARCHITECTURE.md)
- [Deployment guide](docs/deployment-guide.md)
- [API examples](docs/api-examples.md)
- [User guide](docs/user-guide.md)

## License

Proprietary — see [LICENSE](LICENSE).
