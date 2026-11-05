import type { Page } from '@playwright/test';

const engagementId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';
const now = '2026-11-05T10:00:00Z';

function envelope(data: unknown, pagination: unknown = null) {
  return { success: true, data, error: null, pagination };
}
function pageInfo(total: number) {
  return { page: 1, limit: 100, total, pages: total ? 1 : 0 };
}
function engagement(name = 'Authorized E2E Assessment') {
  return {
    id: engagementId, client_id: clientId, name, type: 'pentest', status: 'active',
    start_date: '2026-01-01', end_date: '2026-12-31', testing_window_start: '00:00:00',
    testing_window_end: '23:59:00', testing_window_timezone: 'UTC',
    rules_of_engagement: 'Only approved non-destructive validation.',
    emergency_contact_name: 'Security Lead', emergency_contact_phone: '+123456789',
    emergency_contact_email: 'security@example.com', created_by: userId, created_at: now, updated_at: now,
  };
}
const report = {
  id: '44444444-4444-4444-8444-444444444444', engagement_id: engagementId,
  report_type: 'technical_report', language: 'en', format: 'pdf',
  file_path: 'reports/e2e/report.pdf', file_size: 2048, generated_by: userId, created_at: now,
};

export async function mockApi(page: Page) {
  const engagements = [engagement()];
  const reports: Array<Record<string, unknown>> = [report];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    const fulfill = (data: unknown, status = 200, pagination: unknown = null) => route.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(envelope(data, pagination)),
    });
    if (method === 'POST' && path === '/auth/login') return fulfill({ requires_mfa: true, mfa_setup_required: false, temp_token: 'e2e-challenge' });
    if (method === 'POST' && path === '/auth/mfa/verify') return fulfill({ access_token: 'e2e-access', refresh_token: 'e2e-refresh' });
    if (method === 'GET' && path === '/users/me') return fulfill({ id: userId, email: 'tester@example.com', full_name: 'Test User', role: 'admin', client_id: null, is_active: true, mfa_enabled: true, created_at: now });
    if (method === 'GET' && path === '/dashboard/stats') return fulfill({ active_engagements: 1, running_jobs: 0, open_findings: 0, severity: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 } });
    if (method === 'GET' && path === '/dashboard/findings-trend') return fulfill([]);
    if (method === 'GET' && path === '/engagements') return fulfill(engagements, 200, pageInfo(engagements.length));
    if (method === 'POST' && path === '/engagements') {
      const input = request.postDataJSON() as { name: string };
      const created = { ...engagement(input.name), id: crypto.randomUUID(), status: 'draft' };
      engagements.push(created);
      return fulfill(created, 201);
    }
    if (method === 'GET' && path === '/jobs') return fulfill([], 200, pageInfo(0));
    if (method === 'POST' && path === '/jobs') {
      return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ success: false, data: null, error: { code: 'TARGET_OUT_OF_SCOPE', message: 'Target is outside the authorized scope' }, pagination: null }) });
    }
    if (method === 'GET' && path === '/reports') return fulfill(reports, 200, pageInfo(reports.length));
    if (method === 'POST' && path === '/reports/generate') {
      const input = request.postDataJSON() as { language: 'en' | 'ar'; report_type: string };
      const created = { ...report, id: crypto.randomUUID(), language: input.language, report_type: input.report_type, file_size: null };
      reports.push(created);
      return fulfill(created, 202);
    }
    if (method === 'GET' && path === `/reports/${report.id}/download`) return fulfill({ download_url: 'https://downloads.test/report.pdf', expires_in: 300 });
    if (method === 'GET' && path === '/findings') return fulfill([], 200, pageInfo(0));
    if (method === 'GET' && path === '/clients') return fulfill([{ id: clientId, company_name: 'E2E Client', industry: 'Technology', contact_name: 'Security Lead', contact_email: 'security@example.com', contact_phone: null, notes: null, created_at: now, updated_at: now }], 200, pageInfo(1));
    if (method === 'GET' && path === '/notifications') return fulfill([]);
    if (method === 'GET' && path === '/users/me/sessions') return fulfill([]);
    if (method === 'GET') return fulfill([]);
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: `No E2E route for ${method} ${path}` } }) });
  });
}
