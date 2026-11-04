# API Examples

All API responses use `{ success, data, error, pagination }`. The examples below assume an active engagement with verified scope, ownership, and a signed authorization document.

## Login and MFA

```bash
curl -s https://cyberops.example.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"analyst@example.com","password":"your-password"}'

curl -s https://cyberops.example.com/api/v1/auth/mfa/verify \
  -H 'Content-Type: application/json' \
  -d '{"temp_token":"TEMP_TOKEN","totp_code":"123456"}'
```

Use the returned access token as `Authorization: Bearer ACCESS_TOKEN`. Refresh tokens are rotated on every refresh; always persist the newest value in memory or a secure HTTP-only cookie flow.

## Add scope

```bash
curl -X POST https://cyberops.example.com/api/v1/engagements/ENGAGEMENT_ID/scope \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"asset_type":"domain","value":"app.client.example","in_scope":true,"notes":"Approved production hostname"}'
```

Start ownership verification and publish the returned DNS TXT token before requesting network jobs.

## Create an authorized job

```bash
curl -X POST https://cyberops.example.com/api/v1/jobs \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"engagement_id":"ENGAGEMENT_ID","job_type":"nuclei_scan","targets":["https://app.client.example"],"profile":"standard","parameters":{}}'
```

A rejected job returns HTTP 403 with a stable reason such as `TARGET_NOT_IN_SCOPE`, `TARGET_EXCLUDED`, `OUTSIDE_TESTING_WINDOW`, or `OWNERSHIP_NOT_VERIFIED`. The denial is committed to the audit log and administrators are alerted. Client-supplied headers cannot override the decision.

## Generate a report

```bash
curl -X POST https://cyberops.example.com/api/v1/reports/generate \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"engagement_id":"ENGAGEMENT_ID","report_type":"technical_report","language":"ar","format":"pdf"}'
```

Poll `GET /reports/{id}` until `file_size` is present, then call `GET /reports/{id}/download` for a five-minute presigned URL.
