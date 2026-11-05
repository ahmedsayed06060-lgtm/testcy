import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api-client';

export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}
export function hasRole(...roles: string[]): boolean {
  const role = useAuthStore.getState().user?.role;
  return Boolean(role && roles.includes(role));
}
export function clearAuthentication(): void {
  useAuthStore.getState().clear();
}
export async function establishSession(tokens: { access_token: string; refresh_token: string }): Promise<void> {
  const store = useAuthStore.getState();
  store.setCredentials(null, tokens.access_token, tokens.refresh_token);
  try {
    const user = await authApi.me();
    useAuthStore.getState().setCredentials(user, tokens.access_token, tokens.refresh_token);
    useAuthStore.getState().clearChallenge();
  } catch (error) {
    useAuthStore.getState().clear();
    throw error;
  }
}
