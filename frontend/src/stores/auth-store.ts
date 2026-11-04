import { create } from 'zustand';

interface AuthUser { id: string; email: string; full_name: string; role: string }
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setCredentials: (user: AuthUser | null, accessToken: string, refreshToken: string) => void;
  clear: () => void;
}

// Tokens intentionally remain in memory and are never written to localStorage.
export const useAuthStore = create<AuthState>((set) => ({
  user: null, accessToken: null, refreshToken: null,
  setCredentials: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
  clear: () => set({ user: null, accessToken: null, refreshToken: null }),
}));
