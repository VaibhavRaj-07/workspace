import { create } from 'zustand';
import { User } from '@/types/api';
import { api, tokenStorage, ApiErrorInstance } from '@/lib/api/client';

export const DEMO_USERS = {
  alex: {
    name: 'Alex Rivers',
    email: 'alex@workspace.dev',
    password: 'Password123!',
    role: 'Lead',
    color: '#FFE600',
  },
  sarah: {
    name: 'Sarah Chen',
    email: 'sarah@workspace.dev',
    password: 'Password123!',
    role: 'Full-Stack',
    color: '#FF3EA5',
  },
  rahul: {
    name: 'Rahul Patel',
    email: 'rahul@workspace.dev',
    password: 'Password123!',
    role: 'Frontend',
    color: '#2B4BFF',
  },
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  loginAsDemoUser: (key: keyof typeof DEMO_USERS) => Promise<User>;
  register: (name: string, email: string, password: string, avatarUrl?: string) => Promise<User>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    const token = tokenStorage.getAccessToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const user = await api.auth.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      tokenStorage.clear();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res: any = await api.auth.login({ email, password });
      const accessToken = res.tokens?.accessToken || res.accessToken;
      const refreshToken = res.tokens?.refreshToken || res.refreshToken;
      tokenStorage.setAccessToken(accessToken);
      if (refreshToken) {
        tokenStorage.setRefreshToken(refreshToken);
      }
      set({ user: res.user, isAuthenticated: true, isLoading: false, error: null });
      return res.user;
    } catch (err: any) {
      const msg = err instanceof ApiErrorInstance ? err.message : 'Login failed';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  loginAsDemoUser: async (key: keyof typeof DEMO_USERS) => {
    const creds = DEMO_USERS[key];
    return get().login(creds.email, creds.password);
  },

  register: async (name: string, email: string, password: string, avatarUrl?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res: any = await api.auth.register({ name, email, password, avatarUrl });
      const accessToken = res.tokens?.accessToken || res.accessToken;
      const refreshToken = res.tokens?.refreshToken || res.refreshToken;
      tokenStorage.setAccessToken(accessToken);
      if (refreshToken) {
        tokenStorage.setRefreshToken(refreshToken);
      }
      set({ user: res.user, isAuthenticated: true, isLoading: false, error: null });
      return res.user;
    } catch (err: any) {
      const msg = err instanceof ApiErrorInstance ? err.message : 'Registration failed';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    tokenStorage.clear();
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  clearError: () => set({ error: null }),
  setUser: (user: User | null) => set({ user, isAuthenticated: !!user }),
}));
