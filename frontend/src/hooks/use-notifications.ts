'use client';

import { api, queryString } from '@/lib/api-client';
import { useApiListQuery, useApiMutation } from '@/hooks/use-api-query';
import type { ApiNotification } from '@/types/api';

export function useNotifications(unreadOnly = false) {
  return useApiListQuery<ApiNotification>(['notifications', unreadOnly], `/notifications${queryString({ unread_only: unreadOnly })}`);
}
export function useMarkNotificationRead() {
  return useApiMutation((id: string) => api<ApiNotification>(`/notifications/${id}/read`, { method: 'PUT' }), [['notifications']]);
}
export function useMarkAllNotificationsRead() {
  return useApiMutation(() => api<{ read: boolean }>('/notifications/read-all', { method: 'PUT' }), [['notifications']]);
}
