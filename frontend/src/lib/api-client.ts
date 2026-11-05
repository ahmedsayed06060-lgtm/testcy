import { useAuthStore } from '@/stores/auth-store';
import type { ApiPagination } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiEnvelope<T> {
  data: T;
  pagination: ApiPagination | null;
}

async function parseResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const body = await response.json().catch(() => null) as {
    success?: boolean;
    data?: unknown;
    error?: { code?: string; message?: string };
    pagination?: ApiPagination | null;
  } | null;
  if (!response.ok || body?.success === false) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'REQUEST_FAILED',
      body?.error?.message ?? 'The request could not be completed',
    );
  }
  return {
    data: (body && 'data' in body ? body.data : body) as T,
    pagination: body?.pagination ?? null,
  };
}

async function fetchWithAuth(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
  if (!API_URL) throw new ApiError(503, 'API_NOT_CONFIGURED', 'Set NEXT_PUBLIC_API_URL to connect the FastAPI backend');
  const { accessToken, refreshToken } = useAuthStore.getState();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
  if (response.status === 401 && retry && refreshToken) {
    const refreshed = await fetch(`${API_URL}/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!refreshed.ok) {
      useAuthStore.getState().clear();
      throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired');
    }
    const tokens = (await parseResponse<{ access_token: string; refresh_token: string }>(refreshed)).data;
    const currentUser = useAuthStore.getState().user;
    useAuthStore.getState().setCredentials(currentUser, tokens.access_token, tokens.refresh_token);
    return fetchWithAuth(path, options, false);
  }
  return response;
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<ApiEnvelope<T>> {
  return parseResponse<T>(await fetchWithAuth(path, options, retry));
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  return (await request<T>(path, options, retry)).data;
}

export async function apiList<T>(path: string): Promise<{ items: T[]; pagination: ApiPagination | null }> {
  const result = await request<T[]>(path);
  return { items: result.data, pagination: result.pagination };
}

export async function apiBlob(path: string): Promise<Blob> {
  const response = await fetchWithAuth(path);
  if (!response.ok) await parseResponse<never>(response);
  return response.blob();
}

export function queryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const serialized = search.toString();
  return serialized ? `?${serialized}` : '';
}

export function jsonBody(value: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(value) };
}

export const authApi = {
  login: (email: string, password: string) => api<{ requires_mfa: boolean; mfa_setup_required: boolean; temp_token: string }>(
    '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false,
  ),
  verifyMfa: (temp_token: string, totp_code: string) => api<{ access_token: string; refresh_token: string }>(
    '/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ temp_token, totp_code }) }, false,
  ),
  mfaSetup: (temp_token: string) => api<{ secret: string; qr_uri: string; backup_codes: string[]; temp_token: string }>(
    '/auth/mfa/setup', { method: 'POST', body: JSON.stringify({ temp_token }) }, false,
  ),
  confirmMfaSetup: (temp_token: string, totp_code: string) => api<{ confirmed: boolean }>(
    '/auth/mfa/setup/confirm', { method: 'POST', body: JSON.stringify({ temp_token, totp_code }) }, false,
  ),
  me: () => api<import('@/types/api').ApiUser>('/users/me'),
  logout: (refresh_token: string) => api<{ logged_out: boolean }>(
    '/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token }) }, false,
  ),
  resetRequest: (email: string) => api<{ message: string }>(
    '/auth/password/reset', { method: 'POST', body: JSON.stringify({ email }) }, false,
  ),
  resetConfirm: (token: string, new_password: string) => api<{ password_changed: boolean }>(
    '/auth/password/reset/confirm', { method: 'POST', body: JSON.stringify({ token, new_password }) }, false,
  ),
};
