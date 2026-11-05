'use client';

import { QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList } from '@/lib/api-client';

export function useApiQuery<T>(key: QueryKey, path: string, enabled = true) {
  return useQuery({ queryKey: key, queryFn: () => api<T>(path), enabled });
}

export function useApiListQuery<T>(key: QueryKey, path: string, enabled = true) {
  return useQuery({ queryKey: key, queryFn: () => apiList<T>(path), enabled });
}

export function useApiMutation<TInput, TOutput>(
  mutation: (input: TInput) => Promise<TOutput>,
  invalidate: QueryKey[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mutation,
    onSuccess: async () => {
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
}
