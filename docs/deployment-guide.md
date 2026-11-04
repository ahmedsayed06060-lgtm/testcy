# Deployment Guide

## Prerequisites

- Docker Engine and Compose v2 on an isolated operations host
- A public DNS record for `DOMAIN`
- A secret manager for production database, MinIO, SMTP, MobSF, and field-encryption values
- Outbound firewall rules limiting `cyberops-egress` to explicitly approved targets

## Local development

```bash
cp .env.example .env
python3 backend/scripts/generate_keys.py
# Copy the generated FIELD_ENCRYPTION_KEY into .env
make dev
# In another terminal:
make migrate
make seed
```

The web application is on port 3000. The API is attached to the private Compose network; use a reverse proxy or run Uvicorn locally for `/api/docs`.

## Production

1. Set `ENVIRONMENT=production`, strong database/object-store credentials, `DOMAIN`, `ACME_EMAIL`, SMTP, MobSF, and a unique 32-byte base64 field key.
2. Generate a 4096-bit RS256 key pair with `backend/scripts/generate_keys.py`. Protect the private key with host permissions or your secret manager.
3. Configure Traefik certificates and firewall ingress only on 80/443. Do not publish database, Redis, MinIO, metrics, or worker ports.
4. Deploy with `make prod`, run `docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head`, and create the first admin with `create_superadmin.py`.
5. Build tool images with `make build-tools`, then verify each container's resource and network policy.

## Upgrades

- Back up PostgreSQL and MinIO before every migration.
- Review Alembic diffs and run them during a controlled maintenance window.
- Roll application images before workers, then drain old workers. Never bypass worker authorization during rollout.
- Restore drills must include evidence objects and signing-key availability.

## Observability

`/healthz` checks database, Redis, and object storage. Prometheus is available at `/metrics` only inside the private network; do not route it through Traefik. JSON logs go to stdout and deliberately exclude tokens, credentials, and raw evidence.
