import type { UserDto } from '@zeedle/shared-types';
import { create } from 'zustand';

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  setAuth: (user: UserDto, accessToken: string) => void;
  setToken: (accessToken: string) => void;
  clearAuth: () => void;
}

/** In-memory session only — the access token never touches persistent storage. */
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}));
