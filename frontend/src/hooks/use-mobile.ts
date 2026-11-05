'use client';

import { api, queryString } from '@/lib/api-client';
import { useApiListQuery, useApiMutation, useApiQuery } from '@/hooks/use-api-query';
import type { ApiMobileAnalysis } from '@/types/api';

export function useMobileAnalyses(engagementId: string) {
  return useApiListQuery<ApiMobileAnalysis>(['mobile', engagementId], `/mobile-analyses${queryString({ engagement_id: engagementId })}`, Boolean(engagementId));
}
export function useMobileAnalysis(id: string) {
  return useApiQuery<ApiMobileAnalysis>(['mobile', 'analysis', id], `/mobile-analyses/${id}`, Boolean(id));
}
export function useUploadMobileAnalysis() {
  return useApiMutation((input: { engagement_id: string; app_name: string; platform: 'android' | 'ios'; package_name: string; version?: string; file: File }) => {
    const form = new FormData();
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) form.append(key, value instanceof File ? value : String(value));
    });
    return api<ApiMobileAnalysis>('/mobile-analyses', { method: 'POST', body: form });
  }, [['mobile']]);
}
export function useMobileScan(id: string) {
  return useApiMutation(() => api<{ task_id: string }>(`/mobile-analyses/${id}/scan`, { method: 'POST' }), [['mobile']]);
}
export function useMobileChecklist(id: string) {
  return useApiMutation((manual_checklist: Record<string, boolean | null>) => api<ApiMobileAnalysis>(`/mobile-analyses/${id}/checklist`, { method: 'PUT', body: JSON.stringify({ manual_checklist }) }), [['mobile']]);
}
