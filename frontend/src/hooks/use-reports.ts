'use client';

import { api, queryString } from '@/lib/api-client';
import { useApiListQuery, useApiMutation, useApiQuery } from '@/hooks/use-api-query';
import type { ApiReport, ReportInput } from '@/types/api';

export function useReports(engagementId?: string) {
  return useApiListQuery<ApiReport>(['reports', engagementId], `/reports${queryString({ engagement_id: engagementId })}`);
}
export function useReport(id: string) {
  return useApiQuery<ApiReport>(['reports', id], `/reports/${id}`, Boolean(id));
}
export function useGenerateReport() {
  return useApiMutation((input: ReportInput) => api<ApiReport>('/reports/generate', { method: 'POST', body: JSON.stringify(input) }), [['reports']]);
}
export async function downloadReport(report: ApiReport) {
  const result = await api<{ download_url: string }>(`/reports/${report.id}/download`);
  window.open(result.download_url, '_blank', 'noopener,noreferrer');
}
export function useReportDownload(id: string) {
  return useApiMutation(() => api<{ download_url: string; expires_in: number }>(`/reports/${id}/download`), []);
}
