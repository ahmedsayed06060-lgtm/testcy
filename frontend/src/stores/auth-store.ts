import { create } from 'zustand';
import type { ApiUser } from '@/types/api';

interface AuthState {
  user: ApiUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  tempToken: string | null;
  pendingEmail: string | null;
  setCredentials: (user: ApiUser | null, accessToken: string, refreshToken: string) => void;
  setChallenge: (tempToken: string, email: string) => void;
  clearChallenge: () => void;
  clear: () => void;
}

// Tokens intentionally remain in memory and are never written to localStorage.
export const useAuthStore = create<AuthState>((set) => ({
  user: null, accessToken: null, refreshToken: null, tempToken: null, pendingEmail: null,
  setCredentials: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
  setChallenge: (tempToken, pendingEmail) => set({ tempToken, pendingEmail }),
  clearChallenge: () => set({ tempToken: null, pendingEmail: null }),
  clear: () => set({ user: null, accessToken: null, refreshToken: null, tempToken: null, pendingEmail: null }),
}));
