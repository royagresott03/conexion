import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  is_verified: boolean;
  is_premium: boolean;
  profile?: Profile;
}

interface Profile {
  user_id: string;
  first_name: string;
  last_name?: string;
  birth_date?: string;
  age?: number;
  gender?: string;
  orientation?: string;
  looking_for?: string;
  bio?: string;
  occupation?: string;
  city?: string;
  country?: string;
  photos?: { index: number; url: string }[];
  main_photo_url?: string;
  interests?: { id: number; name: string; emoji: string }[];
  profile_complete?: boolean;
  is_verified?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string; password: string; password2: string;
    first_name: string; birth_date?: string; gender?: string; city?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: User) => void;
  updateProfile: (profile: Partial<Profile>) => void;
}

const saveTokens = (access: string, refresh: string) => {
  Cookies.set('access_token', access, { expires: 1 / 24, sameSite: 'lax' });
  Cookies.set('refresh_token', refresh, { expires: 7, sameSite: 'lax' });
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};

const clearTokens = () => {
  Cookies.remove('access_token');
  Cookies.remove('refresh_token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login(email, password);
          const { tokens, user, profile } = res.data;
          saveTokens(tokens.access, tokens.refresh);
          set({
            user: { ...user, profile },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const res = await authApi.register(data);
          const { tokens, user, profile } = res.data;
          saveTokens(tokens.access, tokens.refresh);
          set({
            user: { ...user, profile },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        const refresh = Cookies.get('refresh_token') || localStorage.getItem('refresh_token');
        if (refresh) {
          try {
            await authApi.logout(refresh);
          } catch { /* ignore */ }
        }
        clearTokens();
        set({ user: null, isAuthenticated: false });
      },

      loadUser: async () => {
        const token = Cookies.get('access_token') || localStorage.getItem('access_token');
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }
        try {
          const res = await authApi.me();
          set({ user: res.data, isAuthenticated: true });
        } catch {
          clearTokens();
          set({ user: null, isAuthenticated: false });
        }
      },

      setUser: (user) => set({ user, isAuthenticated: true }),

      updateProfile: (profileData) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, profile: { ...user.profile, ...profileData } as Profile } });
        }
      },
    }),
    {
      name: 'conexion-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
