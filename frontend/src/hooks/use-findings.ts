'use client';

import { api, queryString } from '@/lib/api-client';
import { useApiListQuery, useApiMutation, useApiQuery } from '@/hooks/use-api-query';
import type { ApiFinding, FindingInput, ListParams } from '@/types/api';

export function useFindings(params: ListParams = {}) {
  return useApiListQuery<ApiFinding>(['findings', params], `/findings${queryString(params)}`);
}
export function useFinding(id: string) {
  return useApiQuery<ApiFinding>(['findings', id], `/findings/${id}`, Boolean(id));
}
export function useCreateFinding() {
  return useApiMutation((input: FindingInput) => api<ApiFinding>('/findings', { method: 'POST', body: JSON.stringify(input) }), [['findings'], ['dashboard']]);
}
export function useUpdateFinding(id: string) {
  return useApiMutation((input: FindingInput & { status: string }) => api<ApiFinding>(`/findings/${id}`, { method: 'PUT', body: JSON.stringify(input) }), [['findings']]);
}
export function useFindingComment(id: string) {
  return useApiMutation((text: string) => api<ApiFinding>(`/findings/${id}/comment`, { method: 'POST', body: JSON.stringify({ text }) }), [['findings', id]]);
}
export function useAcknowledgeFinding(id: string) {
  return useApiMutation((text: string) => api<ApiFinding>(`/findings/${id}/acknowledge`, { method: 'POST', body: JSON.stringify({ text }) }), [['findings', id]]);
}
export function useFindingRetest(id: string) {
  return useApiMutation((input: { result: string; notes: string }) => api<ApiFinding>(`/findings/${id}/retest`, { method: 'POST', body: JSON.stringify(input) }), [['findings', id]]);
}
export function useCVSS() {
  return useApiMutation((vector_string: string) => api<{ score: number; severity: string }>('/findings/cvss/calculate', { method: 'POST', body: JSON.stringify({ vector_string }) }), []);
}
export function useEvidenceUpload(id: string) {
  return useApiMutation((file: File) => {
    const body = new FormData();
    body.append('file', file);
    return api<ApiFinding['evidence_files'][number]>(`/findings/${id}/evidence`, { method: 'POST', body });
  }, [['findings', id]]);
}
