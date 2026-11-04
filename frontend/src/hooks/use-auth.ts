'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import { disconnectNotifications } from '@/lib/socket';

export function useAuth() {
  const store = useAuthStore();
  const router = useRouter();
  const locale = useLocale();
  const logout = () => { store.clear(); disconnectNotifications(); router.push(`/${locale}/login`); };
  return { ...store, isAuthenticated: Boolean(store.accessToken), logout };
}
