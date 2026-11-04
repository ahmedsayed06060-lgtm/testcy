import type { Activity, Engagement, Finding, Job, Report } from '@/types';

export const engagements: Engagement[] = [
  {
    id: 'eng-acme-q4', name: 'External Infrastructure Review', client: 'Acme Corporation', initials: 'AC', color: '#5b6cf9',
    type: 'Penetration test', status: 'active', progress: 72, findings: { critical: 2, high: 4, medium: 8, low: 5, informational: 9 },
    scopeCount: 24, startDate: 'Oct 20, 2026', endDate: 'Nov 12, 2026', owner: { name: 'Layla Hassan', initials: 'LH' },
    authorization: 'verified', description: 'Authorized assessment of Acme’s external network, public applications, and TLS configuration.',
  },
  {
    id: 'eng-northstar-web', name: 'Customer Portal Assessment', client: 'Northstar Financial', initials: 'NF', color: '#0ea5a4',
    type: 'Web application', status: 'active', progress: 48, findings: { critical: 1, high: 3, medium: 6, low: 4, informational: 7 },
    scopeCount: 8, startDate: 'Oct 28, 2026', endDate: 'Nov 18, 2026', owner: { name: 'Omar Khaled', initials: 'OK' },
    authorization: 'verified', description: 'Authenticated and unauthenticated testing of the customer banking portal and supporting APIs.',
  },
  {
    id: 'eng-helix-mobile', name: 'Mobile Application Security', client: 'Helix Health', initials: 'HH', color: '#ec4899',
    type: 'Mobile security', status: 'pending_approval', progress: 12, findings: { critical: 0, high: 1, medium: 2, low: 1, informational: 3 },
    scopeCount: 4, startDate: 'Nov 08, 2026', endDate: 'Nov 27, 2026', owner: { name: 'Mariam Adel', initials: 'MA' },
    authorization: 'pending', description: 'Static and manual MASVS assessment for Android and iOS patient applications.',
  },
  {
    id: 'eng-vertex-cloud', name: 'Cloud Edge Vulnerability Review', client: 'Vertex Logistics', initials: 'VL', color: '#f59e0b',
    type: 'Vulnerability assessment', status: 'active', progress: 86, findings: { critical: 3, high: 5, medium: 11, low: 8, informational: 12 },
    scopeCount: 46, startDate: 'Oct 12, 2026', endDate: 'Nov 07, 2026', owner: { name: 'Youssef Nabil', initials: 'YN' },
    authorization: 'verified', description: 'External vulnerability validation across approved cloud edge assets and Kubernetes gateways.',
  },
  {
    id: 'eng-oasis-social', name: 'Brand & Social Exposure Review', client: 'Oasis Retail Group', initials: 'OR', color: '#8b5cf6',
    type: 'Social assessment', status: 'paused', progress: 35, findings: { critical: 0, high: 2, medium: 3, low: 6, informational: 4 },
    scopeCount: 12, startDate: 'Oct 25, 2026', endDate: 'Nov 22, 2026', owner: { name: 'Layla Hassan', initials: 'LH' },
    authorization: 'verified', description: 'Public-data review of brand impersonation, account posture, and security awareness.',
  },
  {
    id: 'eng-atlas-annual', name: 'Annual Security Assessment', client: 'Atlas Manufacturing', initials: 'AM', color: '#3b82f6',
    type: 'Comprehensive', status: 'completed', progress: 100, findings: { critical: 1, high: 2, medium: 9, low: 14, informational: 18 },
    scopeCount: 63, startDate: 'Sep 01, 2026', endDate: 'Oct 15, 2026', owner: { name: 'Omar Khaled', initials: 'OK' },
    authorization: 'verified', description: 'Completed annual infrastructure, application, and remediation validation program.',
  },
];

export const findings: Finding[] = [
  {
    id: 'CO-2026-0148', title: 'SQL injection in customer search endpoint', engagementId: 'eng-northstar-web', engagement: 'Customer Portal Assessment',
    client: 'Northstar Financial', severity: 'critical', status: 'open', asset: 'portal.northstar.example', cvss: 9.8, cwe: 'CWE-89', discovered: '18 min ago', owner: 'Omar Khaled',
    description: 'The customer search endpoint concatenates untrusted filter input into a database query. A crafted parameter can alter query logic and expose unauthorized records.',
    remediation: 'Use parameterized queries for every filter value, apply allowlisted sort fields, and add regression tests for boolean and time-based injection payloads.',
    evidence: 'POST /api/v2/customers/search\nParameter: filter\nResponse differences confirmed with non-destructive boolean probes.', tags: ['injection', 'api', 'data-exposure'],
  },
  {
    id: 'CO-2026-0147', title: 'Exposed Kubernetes dashboard with legacy authentication', engagementId: 'eng-vertex-cloud', engagement: 'Cloud Edge Vulnerability Review',
    client: 'Vertex Logistics', severity: 'critical', status: 'in_progress', asset: 'k8s.vertex.example', cvss: 9.1, cwe: 'CWE-306', discovered: '1 hour ago', owner: 'Youssef Nabil',
    description: 'A Kubernetes dashboard is reachable from the approved external range and accepts a legacy authentication flow without sufficient access restrictions.',
    remediation: 'Remove public access, place the dashboard behind the private management network, enforce OIDC MFA, and rotate all legacy service credentials.',
    evidence: 'TLS service on 443/TCP exposes the Kubernetes Dashboard v2.7 login route.', tags: ['kubernetes', 'authentication'],
  },
  {
    id: 'CO-2026-0146', title: 'Broken object-level authorization on invoice API', engagementId: 'eng-acme-q4', engagement: 'External Infrastructure Review',
    client: 'Acme Corporation', severity: 'critical', status: 'open', asset: 'api.acme.example', cvss: 8.6, cwe: 'CWE-639', discovered: '3 hours ago', owner: 'Layla Hassan',
    description: 'Invoice identifiers are not consistently bound to the authenticated tenant, permitting horizontal access to another tenant’s invoice metadata.',
    remediation: 'Enforce tenant-scoped authorization at every object lookup and add cross-tenant integration tests using non-sequential identifiers.',
    evidence: 'Authorized test accounts A and B were used. Account A could read a metadata object owned by account B.', tags: ['api', 'authorization', 'bola'],
  },
  {
    id: 'CO-2026-0145', title: 'Weak TLS protocol enabled on public gateway', engagementId: 'eng-acme-q4', engagement: 'External Infrastructure Review',
    client: 'Acme Corporation', severity: 'high', status: 'retest', asset: 'gateway.acme.example', cvss: 7.4, cwe: 'CWE-326', discovered: '5 hours ago', owner: 'Mariam Adel',
    description: 'The public gateway negotiates TLS 1.0 and legacy cipher suites, reducing transport confidentiality for compatible clients.',
    remediation: 'Disable TLS 1.0/1.1, prefer TLS 1.3, retain only modern AEAD suites, and validate compatibility before deployment.',
    evidence: 'testssl.sh confirmed TLS 1.0 negotiation and CBC suite availability.', tags: ['tls', 'configuration'],
  },
  {
    id: 'CO-2026-0144', title: 'Missing anti-clickjacking protection', engagementId: 'eng-northstar-web', engagement: 'Customer Portal Assessment',
    client: 'Northstar Financial', severity: 'medium', status: 'open', asset: 'portal.northstar.example', cvss: 4.3, cwe: 'CWE-1021', discovered: 'Yesterday', owner: 'Omar Khaled',
    description: 'Sensitive account pages omit both a restrictive CSP frame-ancestors directive and X-Frame-Options.',
    remediation: 'Set Content-Security-Policy frame-ancestors to none for sensitive pages and verify framing is blocked across browsers.',
    evidence: 'HTTP response headers did not contain frame-ancestors or X-Frame-Options.', tags: ['headers', 'web'],
  },
  {
    id: 'CO-2026-0143', title: 'Verbose application error reveals internal paths', engagementId: 'eng-helix-mobile', engagement: 'Mobile Application Security',
    client: 'Helix Health', severity: 'low', status: 'fixed', asset: 'api.helix.example', cvss: 3.1, cwe: 'CWE-209', discovered: 'Yesterday', owner: 'Mariam Adel',
    description: 'Malformed requests reveal internal build paths and package versions through a detailed application error.',
    remediation: 'Return generic client errors and retain detailed diagnostics only in access-controlled server logs.',
    evidence: 'A malformed JSON body returned a framework stack trace with internal paths.', tags: ['information-disclosure'],
  },
];

export const jobs: Job[] = [
  { id: 'JOB-8F42A', type: 'Nuclei scan', target: 'api.acme.example', engagementId: 'eng-acme-q4', engagement: 'External Infrastructure Review', profile: 'standard', status: 'running', progress: 68, started: '12:42 PM', duration: '18m 24s', triggeredBy: 'Layla Hassan' },
  { id: 'JOB-8F41D', type: 'Nmap service scan', target: '10.24.8.0/25', engagementId: 'eng-vertex-cloud', engagement: 'Cloud Edge Vulnerability Review', profile: 'deep', status: 'running', progress: 41, started: '12:36 PM', duration: '24m 08s', triggeredBy: 'Youssef Nabil' },
  { id: 'JOB-8F409', type: 'TLS assessment', target: 'portal.northstar.example', engagementId: 'eng-northstar-web', engagement: 'Customer Portal Assessment', profile: 'standard', status: 'validating', progress: 8, started: '1:01 PM', duration: '45s', triggeredBy: 'Omar Khaled' },
  { id: 'JOB-8F3FE', type: 'ZAP passive scan', target: 'shop.oasis.example', engagementId: 'eng-oasis-social', engagement: 'Brand & Social Exposure Review', profile: 'light', status: 'queued', progress: 0, started: '1:03 PM', duration: '—', triggeredBy: 'Layla Hassan' },
  { id: 'JOB-8F3E2', type: 'Nuclei scan', target: 'gateway.acme.example', engagementId: 'eng-acme-q4', engagement: 'External Infrastructure Review', profile: 'standard', status: 'completed', progress: 100, started: '10:14 AM', duration: '12m 31s', triggeredBy: 'Mariam Adel' },
];

export const reports: Report[] = [
  { id: 'RPT-2094', name: 'Executive Security Summary', client: 'Acme Corporation', type: 'Executive summary', language: 'English', format: 'PDF', created: 'Nov 04, 2026 · 11:32 AM', size: '2.4 MB', author: 'Layla Hassan' },
  { id: 'RPT-2093', name: 'Customer Portal Technical Report', client: 'Northstar Financial', type: 'Technical report', language: 'English', format: 'PDF', created: 'Nov 03, 2026 · 4:18 PM', size: '6.8 MB', author: 'Omar Khaled' },
  { id: 'RPT-2092', name: 'خطة معالجة الثغرات الأمنية', client: 'Vertex Logistics', type: 'Remediation plan', language: 'Arabic', format: 'DOCX', created: 'Nov 03, 2026 · 10:06 AM', size: '1.1 MB', author: 'Youssef Nabil' },
  { id: 'RPT-2091', name: 'Annual Assessment — Final', client: 'Atlas Manufacturing', type: 'Full report', language: 'English', format: 'PDF', created: 'Oct 16, 2026 · 2:45 PM', size: '12.2 MB', author: 'Omar Khaled' },
];

export const activities: Activity[] = [
  { id: 'act-1', actor: 'Layla Hassan', initials: 'LH', action: 'confirmed a critical finding in', subject: 'External Infrastructure Review', time: '8 min ago', kind: 'finding' },
  { id: 'act-2', actor: 'System', initials: 'SY', action: 'completed authorized scan', subject: 'JOB-8F3E2', time: '24 min ago', kind: 'job' },
  { id: 'act-3', actor: 'Omar Khaled', initials: 'OK', action: 'generated an executive report for', subject: 'Acme Corporation', time: '1 hour ago', kind: 'report' },
  { id: 'act-4', actor: 'Mariam Adel', initials: 'MA', action: 'verified ownership for', subject: 'api.helix.example', time: '3 hours ago', kind: 'authorization' },
];

export const trendData = [
  { day: 'Oct 24', critical: 4, high: 10, medium: 18, low: 22 },
  { day: 'Oct 25', critical: 4, high: 12, medium: 17, low: 24 },
  { day: 'Oct 26', critical: 5, high: 11, medium: 21, low: 24 },
  { day: 'Oct 27', critical: 5, high: 13, medium: 23, low: 27 },
  { day: 'Oct 28', critical: 6, high: 14, medium: 22, low: 29 },
  { day: 'Oct 29', critical: 6, high: 16, medium: 25, low: 27 },
  { day: 'Oct 30', critical: 8, high: 15, medium: 27, low: 31 },
  { day: 'Oct 31', critical: 8, high: 18, medium: 26, low: 33 },
  { day: 'Nov 01', critical: 9, high: 17, medium: 29, low: 32 },
  { day: 'Nov 02', critical: 8, high: 19, medium: 28, low: 35 },
  { day: 'Nov 03', critical: 8, high: 20, medium: 31, low: 34 },
  { day: 'Nov 04', critical: 7, high: 19, medium: 33, low: 36 },
];

export const severityData = [
  { name: 'Critical', key: 'critical', value: 7, color: '#e5484d' },
  { name: 'High', key: 'high', value: 19, color: '#f97316' },
  { name: 'Medium', key: 'medium', value: 33, color: '#eab308' },
  { name: 'Low', key: 'low', value: 36, color: '#3b82f6' },
  { name: 'Informational', key: 'informational', value: 53, color: '#94a3b8' },
];
