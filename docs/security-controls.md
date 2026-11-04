# Security Controls

| Control | Implementation | Verification |
|---|---|---|
| Engagement authorization | Active status, date/time window, assignment, approved signed document | Positive/negative gate tests |
| Scope enforcement | Exact IP, CIDR subset, canonical IDNA domain hierarchy, URL hostname extraction | Boundary and malformed-input tests |
| Exclusions | Evaluated before inclusion using the same containment semantics | `TARGET_EXCLUDED` test |
| Ownership | Required on the matching domain/IP rule; inherited only through containment | Ownership denial and inheritance tests |
| Worker safety | Full gate revalidation before every tool execution | Worker authorization tests |
| MFA | Mandatory TOTP, encrypted secret, hashed single-use backup codes | Login/setup/backup-code tests |
| Session security | Opaque hashed refresh tokens, rotation, session binding, family revocation | Reuse and rotation tests |
| Tenant isolation | Service-level filters plus PostgreSQL RLS | Cross-client API tests |
| Audit integrity | Database UPDATE/DELETE rules | Immutability integration tests |
| Evidence | Type/size checks, hashes, private MinIO, five-minute signed URLs | Upload and tenant-download tests |
| Rich content | Bleach allowlists; no raw tool HTML rendered | Sanitization tests |
| Tool sandbox | Read-only root, tmpfs, no capabilities, no privilege, resource limits, controlled network | Container policy inspection |
| Reporting | Sanitized data, autoescaped Jinja, Arabic RTL, encrypted storage | PDF/DOCX rendering tests |
| Awareness simulations | Phishing-specific approval, verified employee scope, no forms/passwords, aggregate reporting | Campaign policy tests |

## Hard invariants

1. Admin status does not bypass scope, dates, documents, or ownership.
2. A queued job is not proof of authorization; workers revalidate.
3. Exclusions always take precedence over inclusions.
4. Client users never receive raw tool output.
5. No phishing form may request or store credentials.
