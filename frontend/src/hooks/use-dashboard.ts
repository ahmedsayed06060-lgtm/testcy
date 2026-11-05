'use client';

import { useApiQuery } from '@/hooks/use-api-query';
import type { ApiDashboardStats, ApiEngagement } from '@/types/api';

export function useDashboardStats() {
  return useApiQuery<ApiDashboardStats>(['dashboard', 'stats'], '/dashboard/stats');
}
export function useEngagementOverview() {
  return useApiQuery<ApiEngagement[]>(['dashboard', 'engagement-overview'], '/dashboard/engagement-overview');
}
export function useFindingsTrend(period: '7d' | '30d' | '90d' = '30d') {
  return useApiQuery<Array<Record<string, string | number>>>(['dashboard', 'findings-trend', period], `/dashboard/findings-trend?period=${period}`);
}
export function useClientStats(clientId: string) {
  return useApiQuery<{ client_id: string; engagements: number; findings: Record<string, number> }>(['dashboard', 'client', clientId], `/dashboard/client/${clientId}/stats`, Boolean(clientId));
}
