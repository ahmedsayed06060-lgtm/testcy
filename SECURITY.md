# Security Policy

## Authorization boundary

CyberOps Hub is designed only for assets explicitly authorized in writing. The central gate checks engagement state, current testing window, user assignment, approved authorization documents, inclusion and exclusion scope, and domain/IP ownership before dispatch. Workers repeat the complete check immediately before execution. There is no supported bypass.

## Reporting a vulnerability

Report suspected vulnerabilities privately to the repository owner through GitHub Security Advisories. Include reproduction steps, impact, affected revision, and suggested remediation. Do not test against production users or expose client evidence. We aim to acknowledge reports within three business days.

## Credential and secret handling

- Never commit `.env`, JWT private keys, MinIO credentials, MFA seeds, refresh tokens, or evidence.
- Rotate credentials immediately after accidental disclosure and invalidate all active sessions.
- Access tokens are 15-minute RS256 JWTs signed and verified with PyJWT and an explicitly pinned algorithm/key ID. Refresh tokens are opaque, hashed at rest, rotated, and bound to sessions for family-reuse detection.
- TOTP secrets and integration credentials use AES-256-GCM with independent random nonces.

## Deployment requirements

- Use TLS through Traefik and a production secret manager; do not expose PostgreSQL, Redis, MinIO, MobSF, metrics, or workers publicly.
- Apply egress rules to the dedicated tool network so only approved targets are reachable.
- Treat Docker socket access as privileged infrastructure access. Run workers on an isolated host with no client workloads and monitor every container request.
- Restrict report download URLs to five minutes and verify tenant access before issuing them.
- Review audit and authorization-denied alerts continuously.

## Secure development

Pull requests run Ruff, strict mypy, pytest with an 85% coverage floor, live PostgreSQL migration/RLS/audit-rule integration tests, TypeScript checks, Vitest, Playwright, dependency audits, and Trivy. New execution paths must include authorization-gate tests, including worker revalidation and immutable denial auditing.

PDF generation uses patched WeasyPrint with presentational hints disabled and a deny-all resource fetcher. CI makes one documented `pip-audit` exception for `PYSEC-2026-3412`, whose vulnerable `<body background>` presentational-hint path is disabled and unreachable; all other known dependency findings fail the build.
