'use client';

import { api, queryString } from '@/lib/api-client';
import { useApiListQuery, useApiMutation, useApiQuery } from '@/hooks/use-api-query';
import type { ApiUser, ApiUserSession, ListParams } from '@/types/api';

export type UserInput = Partial<Pick<ApiUser, 'email' | 'full_name' | 'role' | 'client_id' | 'is_active'>> & { password?: string };
export function useCurrentUser() {
  return useApiQuery<ApiUser>(['users', 'me'], '/users/me');
}
export function useUpdateMe() {
  return useApiMutation((full_name: string) => api<ApiUser>('/users/me', { method: 'PUT', body: JSON.stringify({ full_name }) }), [['users', 'me']]);
}
export function useChangePassword() {
  return useApiMutation((input: { current_password: string; new_password: string }) => api<{ password_changed: boolean }>('/users/me/password', { method: 'PUT', body: JSON.stringify(input) }), []);
}
export function useUsers(params: ListParams = {}) {
  return useApiListQuery<ApiUser>(['users', params], `/users${queryString(params)}`);
}
export function useUser(id: string) {
  return useApiQuery<ApiUser>(['users', id], `/users/${id}`, Boolean(id));
}
export function useCreateUser() {
  return useApiMutation((input: UserInput) => api<ApiUser>('/users', { method: 'POST', body: JSON.stringify(input) }), [['users']]);
}
export function useUpdateUser(id: string) {
  return useApiMutation((input: UserInput) => api<ApiUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(input) }), [['users']]);
}
export function useDeleteUser(id: string) {
  return useApiMutation(() => api<{ deleted: boolean }>(`/users/${id}`, { method: 'DELETE' }), [['users']]);
}
export function useSessions() {
  return useApiQuery<ApiUserSession[]>(['users', 'me', 'sessions'], '/users/me/sessions');
}
export function useRevokeAllSessions() {
  return useApiMutation(() => api<{ revoked: boolean }>('/users/me/sessions', { method: 'DELETE' }), [['users', 'me', 'sessions']]);
}
export function useRevokeSession() {
  return useApiMutation((id: string) => api<{ revoked: boolean }>(`/users/me/sessions/${id}`, { method: 'DELETE' }), [['users', 'me', 'sessions']]);
}
export function useActiveSessions() {
  const sessions = useSessions();
  const revoke = useRevokeSession();
  return { ...sessions, revoke };
}
