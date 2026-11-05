'use client';

import { api, queryString } from '@/lib/api-client';
import { useApiListQuery, useApiMutation, useApiQuery } from '@/hooks/use-api-query';
import type { ApiClient, ListParams } from '@/types/api';

export type ClientInput = Partial<Pick<ApiClient, 'company_name' | 'industry' | 'contact_name' | 'contact_email' | 'contact_phone' | 'notes'>> & Pick<ApiClient, 'company_name'>;
export function useClients(params: ListParams = {}) { return useApiListQuery<ApiClient>(['clients', params], `/clients${queryString(params)}`); }
export function useClient(id: string) { return useApiQuery<ApiClient>(['clients', id], `/clients/${id}`, Boolean(id)); }
export function useCreateClient() { return useApiMutation((input: ClientInput) => api<ApiClient>('/clients', { method: 'POST', body: JSON.stringify(input) }), [['clients']]); }
export function useUpdateClient(id: string) { return useApiMutation((input: ClientInput) => api<ApiClient>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(input) }), [['clients'], ['clients', id]]); }
export function useDeleteClient(id: string) { return useApiMutation(() => api<{ deleted: boolean }>(`/clients/${id}`, { method: 'DELETE' }), [['clients']]); }
