'use client';

import { api, queryString } from '@/lib/api-client';
import { useApiListQuery, useApiMutation, useApiQuery } from '@/hooks/use-api-query';
import type { ApiJob, ListParams } from '@/types/api';

export interface JobInput { engagement_id: string; job_type: string; targets: string[]; profile: 'light' | 'standard' | 'deep'; parameters?: Record<string, unknown> }
export function useJobs(params: ListParams = {}) {
  return useApiListQuery<ApiJob>(['jobs', params], `/jobs${queryString(params)}`);
}
export function useJob(id: string) {
  return useApiQuery<ApiJob>(['jobs', id], `/jobs/${id}`, Boolean(id));
}
export function useCreateJob() {
  return useApiMutation((input: JobInput) => api<ApiJob>('/jobs', { method: 'POST', body: JSON.stringify(input) }), [['jobs']]);
}
export function useCancelJob(id: string) {
  return useApiMutation(() => api<ApiJob>(`/jobs/${id}/cancel`, { method: 'POST' }), [['jobs'], ['dashboard']]);
}
export function useKillSwitch() {
  return useApiMutation(() => api<{ cancelled_jobs: number }>('/jobs/kill-switch', { method: 'POST' }), [['jobs'], ['dashboard']]);
}
