'use client';

import { api, queryString } from '@/lib/api-client';
import { useApiListQuery, useApiMutation, useApiQuery } from '@/hooks/use-api-query';
import type { ApiPhishingCampaign, ApiSocialAssessment } from '@/types/api';

export function useSocialAssessments(engagementId: string) {
  return useApiListQuery<ApiSocialAssessment>(['social', engagementId], `/social-assessments${queryString({ engagement_id: engagementId })}`, Boolean(engagementId));
}
export function useSocialAssessment(id: string) {
  return useApiQuery<ApiSocialAssessment>(['social', 'assessment', id], `/social-assessments/${id}`, Boolean(id));
}
export function useCreateSocialAssessment() {
  return useApiMutation((input: { engagement_id: string; platform: string; account_handle: string }) => api<ApiSocialAssessment>('/social-assessments', { method: 'POST', body: JSON.stringify(input) }), [['social']]);
}
export function useSocialChecklist(id: string) {
  return useApiMutation((checklist_results: Record<string, boolean | null>) => api<ApiSocialAssessment>(`/social-assessments/${id}/checklist`, { method: 'PUT', body: JSON.stringify({ checklist_results }) }), [['social']]);
}
export function useImpersonationScan(id: string) {
  return useApiMutation(() => api<{ task_id: string }>(`/social-assessments/${id}/impersonation-scan`, { method: 'POST' }), [['social']]);
}
export function usePhishingCampaigns(engagementId: string) {
  return useApiListQuery<ApiPhishingCampaign>(['phishing', engagementId], `/phishing-campaigns${queryString({ engagement_id: engagementId })}`, Boolean(engagementId));
}
export function usePhishingCampaign(id: string) {
  return useApiQuery<ApiPhishingCampaign>(['phishing', 'campaign', id], `/phishing-campaigns/${id}`, Boolean(id));
}
export function useSendCampaign(id: string) {
  return useApiMutation(() => api<{ task_id: string }>(`/phishing-campaigns/${id}/send`, { method: 'POST' }), [['phishing']]);
}
export function useCreateCampaign() {
  return useApiMutation((input: {
    engagement_id: string; name: string; approval_doc_id: string;
    targets: Array<{ email: string; department: string }>; template_html: string;
    subject_line: string; sender_name: string; sender_email: string;
    landing_page_html: string; training_page_html: string;
  }) => api<ApiPhishingCampaign>('/phishing-campaigns', { method: 'POST', body: JSON.stringify(input) }), [['phishing']]);
}
export function useLaunchCampaign(id: string) {
  return useSendCampaign(id);
}
export function useCancelCampaign(id: string) {
  return useApiMutation(() => api<ApiPhishingCampaign>(`/phishing-campaigns/${id}/cancel`, { method: 'POST' }), [['phishing']]);
}
export function useCampaignResults(id: string) {
  return useApiQuery<import('@/types/api').ApiCampaignMetrics>(['phishing', id, 'results'], `/phishing-campaigns/${id}/results`, Boolean(id));
}
