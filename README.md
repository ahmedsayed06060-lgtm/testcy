# CyberOps Hub

A bilingual security operations platform for managing explicitly authorized engagements, scope, evidence, findings, and reports. **The server-side authorization gate fails closed and has no bypass.**

## Stack

- Next.js 14, strict TypeScript, Tailwind CSS, TanStack Query, Zustand, next-intl
- FastAPI, SQLAlchemy 2 async, PostgreSQL 16, Alembic, Celery, Redis, MinIO
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
npm install
npm run dev
```

The web application includes a clearly labelled local demonstration dataset so its interface can be reviewed without infrastructure. Set `NEXT_PUBLIC_API_URL` to connect it to a running API.

## Verification

```bash
make lint
make test
make build
```

Backend tests focus on authentication, RBAC, scope matching, time windows, ownership checks, and denial auditing. Frontend tests cover accessible forms, scope validation, CVSS calculation, and data tables.

## Security boundary

Only use CyberOps Hub against assets for which you hold explicit written permission. Approval in the UI is never sufficient by itself: current time, assignment, exact scope, exclusions, signed authorization, and asset ownership are checked before dispatch and again by the worker. See [SECURITY.md](SECURITY.md) and [docs/security-controls.md](docs/security-controls.md).

## Documentation

- [Architecture and Mermaid diagrams](ARCHITECTURE.md)
- [Deployment guide](docs/deployment-guide.md)
- [API examples](docs/api-examples.md)
- [User guide](docs/user-guide.md)

## License

Proprietary — see [LICENSE](LICENSE).
