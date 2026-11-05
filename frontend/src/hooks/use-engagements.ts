'use client';

import { api, queryString } from '@/lib/api-client';
import { useApiListQuery, useApiMutation, useApiQuery } from '@/hooks/use-api-query';
import type { ApiAuthorizationDoc, ApiEngagement, ApiScopeItem, EngagementInput, ListParams } from '@/types/api';

export function useEngagements(params: ListParams = {}) {
  return useApiListQuery<ApiEngagement>(['engagements', params], `/engagements${queryString(params)}`);
}
export function useEngagement(id: string) {
  return useApiQuery<ApiEngagement>(['engagements', id], `/engagements/${id}`, Boolean(id));
}
export function useCreateEngagement() {
  return useApiMutation((input: EngagementInput) => api<ApiEngagement>('/engagements', { method: 'POST', body: JSON.stringify(input) }), [['engagements']]);
}
export function useTransitionEngagement(id: string) {
  return useApiMutation((new_status: string) => api<ApiEngagement>(`/engagements/${id}/transition`, { method: 'POST', body: JSON.stringify({ new_status }) }), [['engagements']]);
}
export function useAssignEngagement(id: string) {
  return useApiMutation((input: { user_id: string; role_in_engagement: 'lead' | 'member' | 'reviewer' }) => api<{ assigned: boolean }>(`/engagements/${id}/assign`, { method: 'POST', body: JSON.stringify(input) }), [['engagements']]);
}
export function useScope(engagementId: string) {
  return useApiQuery<ApiScopeItem[]>(['engagements', engagementId, 'scope'], `/engagements/${engagementId}/scope`, Boolean(engagementId));
}
export function useCreateScope(engagementId: string) {
  return useApiMutation((input: { asset_type: ApiScopeItem['asset_type']; value: string; in_scope: boolean; notes?: string }) => api<ApiScopeItem>(`/engagements/${engagementId}/scope`, { method: 'POST', body: JSON.stringify(input) }), [['engagements', engagementId, 'scope']]);
}
export function useDeleteScope(engagementId: string) {
  return useApiMutation((itemId: string) => api<{ deleted: boolean }>(`/engagements/${engagementId}/scope/${itemId}`, { method: 'DELETE' }), [['engagements', engagementId, 'scope']]);
}
export function useVerifyScope(engagementId: string) {
  return useApiMutation((itemId: string) => api<{ verification_started: boolean; verification_token: string }>(`/engagements/${engagementId}/scope/${itemId}/verify-ownership`, { method: 'POST' }), [['engagements', engagementId, 'scope']]);
}
export function useAuthorizationDocs(engagementId: string) {
  return useApiQuery<ApiAuthorizationDoc[]>(['engagements', engagementId, 'authorization-docs'], `/engagements/${engagementId}/authorization-docs`, Boolean(engagementId));
}
export function useUploadAuthorizationDoc(engagementId: string) {
  return useApiMutation((input: { file: File; doc_type: ApiAuthorizationDoc['doc_type'] }) => { const body = new FormData(); body.append('file', input.file); body.append('doc_type', input.doc_type); return api<ApiAuthorizationDoc>(`/engagements/${engagementId}/authorization-docs`, { method: 'POST', body }); }, [['engagements', engagementId, 'authorization-docs']]);
}
export function useReviewAuthorizationDoc(engagementId: string) {
  return useApiMutation((input: { id: string; decision: 'approve' | 'reject'; reason?: string }) => api<ApiAuthorizationDoc>(`/engagements/${engagementId}/authorization-docs/${input.id}/${input.decision}`, { method: 'POST', body: JSON.stringify(input.decision === 'reject' ? { reason: input.reason ?? 'Authorization evidence is insufficient' } : {}) }), [['engagements', engagementId, 'authorization-docs']]);
}
