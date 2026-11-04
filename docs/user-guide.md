# User Guide

## Engagement workflow

1. **Create a draft.** Select the client, assessment type, testing dates, rules of engagement, and emergency contact.
2. **Define scope.** Add exact domains, IPs, CIDR ranges, URLs, application IDs, or social accounts. Add every prohibited asset as an explicit exclusion.
3. **Verify ownership.** Publish the DNS TXT challenge or complete the controlled manual review. A parent domain/network verifies only assets it actually contains.
4. **Upload authorization.** A different Engagement Manager or Admin independently approves the signed document.
5. **Activate the engagement.** Assignment and current testing-window checks still apply to each execution.
6. **Run jobs.** Select an allowlisted tool/profile. The UI preview is informational; the server and worker are authoritative.
7. **Review findings.** Validate evidence, assign owners, calculate CVSS, request retests, and preserve comments.
8. **Deliver reports.** Generate executive, technical, or remediation artifacts in English or Arabic RTL.

## Role guidance

- **Admin:** user management, global settings, immutable audit search, and emergency kill switch.
- **Engagement Manager:** clients, engagements, scope, independent document approval, assignments, and reports.
- **Pentester:** assigned authorized jobs, findings, evidence, and retests.
- **Analyst:** read-only assigned engagements, findings, and reports.
- **Client:** own engagement summaries and reports only; raw tool output and internal comments are excluded.

## Local demonstration

With no `NEXT_PUBLIC_API_URL`, the web interface uses local demonstration data. Login credentials are pre-filled and the demonstration MFA code is `123456`. No real scans are launched. Setting the API URL switches login and token handling to FastAPI.

## Accessibility and localization

Use the language control to switch between English and Arabic. The document direction changes to RTL, keyboard focus remains visible, dialogs trap focus, and core workflows are usable without a pointer.
