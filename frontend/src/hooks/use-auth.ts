'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import { disconnectNotifications } from '@/lib/socket';
import { authApi } from '@/lib/api-client';

export function useAuth() {
  const store = useAuthStore();
  const router = useRouter();
  const locale = useLocale();
  const logout = () => { const refreshToken = store.refreshToken; store.clear(); disconnectNotifications(); if (refreshToken) void authApi.logout(refreshToken).catch(() => undefined); router.push(`/${locale}/login`); };
  return { ...store, isAuthenticated: Boolean(store.accessToken), logout };
}
