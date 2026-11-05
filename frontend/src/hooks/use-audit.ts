'use client';

import { queryString } from '@/lib/api-client';
import { useApiListQuery } from '@/hooks/use-api-query';
import type { ApiAuditLog, ListParams } from '@/types/api';

export function useAuditLogs(params: ListParams = {}) {
  return useApiListQuery<ApiAuditLog>(['audit-logs', params], `/audit-logs${queryString(params)}`);
}
