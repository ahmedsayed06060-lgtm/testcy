import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => null) as { success?: boolean; data?: unknown; error?: { code?: string; message?: string } } | null;
  if (!response.ok || body?.success === false) throw new ApiError(response.status, body?.error?.code ?? 'REQUEST_FAILED', body?.error?.message ?? 'The request could not be completed');
  return body?.data ?? body;
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  if (!API_URL) throw new ApiError(503, 'DEMO_MODE', 'Set NEXT_PUBLIC_API_URL to connect the FastAPI backend');
  const { accessToken, refreshToken } = useAuthStore.getState();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
  if (response.status === 401 && retry && refreshToken) {
    const refreshed = await fetch(`${API_URL}/auth/token/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refreshToken }) });
    if (!refreshed.ok) { useAuthStore.getState().clear(); throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired'); }
    const tokens = await parseResponse(refreshed) as { access_token: string; refresh_token: string };
    const currentUser = useAuthStore.getState().user;
    useAuthStore.getState().setCredentials(currentUser, tokens.access_token, tokens.refresh_token);
    return api<T>(path, options, false);
  }
  return parseResponse(response) as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) => api<{ requires_mfa: boolean; mfa_setup_required: boolean; temp_token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false),
  verifyMfa: (temp_token: string, totp_code: string) => api<{ access_token: string; refresh_token: string }>('/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ temp_token, totp_code }) }, false),
};
