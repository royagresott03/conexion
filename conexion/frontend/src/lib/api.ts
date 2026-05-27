import axios from 'axios';
import Cookies from 'js-cookie';

// El navegador siempre llama a localhost:8000 directamente
const API_URL = typeof window !== 'undefined'
  ? 'http://localhost:8000'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000');

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token') ||
    (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = Cookies.get('refresh_token') || localStorage.getItem('refresh_token');
        if (refresh) {
          const res = await axios.post(`http://localhost:8000/api/auth/token/refresh/`, { refresh });
          const newAccess = res.data.access;
          Cookies.set('access_token', newAccess, { expires: 1 / 24 });
          localStorage.setItem('access_token', newAccess);
          original.headers.Authorization = `Bearer ${newAccess}`;
          return api(original);
        }
      } catch {
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        localStorage.clear();
        if (typeof window !== 'undefined') window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────
export const authApi = {
  register: (data: {
    email: string; password: string; password2: string;
    first_name: string; birth_date?: string; gender?: string; city?: string;
  }) => api.post('/auth/register/', data),

  login: (email: string, password: string) =>
    api.post('/auth/login/', { email, password }),

  logout: (refresh: string) =>
    api.post('/auth/logout/', { refresh }),

  me: () => api.get('/auth/me/'),

  refreshToken: (refresh: string) =>
    api.post('/auth/token/refresh/', { refresh }),
};

// ─── Profile ─────────────────────────────────────────────
export const profileApi = {
  getMyProfile: () => api.get('/auth/profile/'),
  updateProfile: (data: Record<string, unknown>) =>
    api.patch('/auth/profile/', data),
  uploadPhoto: (slot: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    form.append('slot', slot);
    return api.post('/auth/profile/photo/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deletePhoto: (slot: string) =>
    api.delete('/auth/profile/photo/', { data: { slot } }),
  getInterests: () => api.get('/auth/interests/'),
  getPublicProfile: (userId: string) => api.get(`/auth/users/${userId}/`),
  updateLocation: (lat: number, lon: number, city?: string) =>
    api.post('/auth/profile/location/', { latitude: lat, longitude: lon, city }),
};

// ─── Matches ─────────────────────────────────────────────
export const matchApi = {
  getDiscover: () => api.get('/discover/'),
  swipe: (user_to: string, action: 'like' | 'superlike' | 'pass') =>
    api.post('/swipe/', { user_to, action }),
  getMatches: () => api.get('/matches/'),
  unmatch: (matchId: string) => api.delete(`/matches/${matchId}/`),
};

// ─── Chat ────────────────────────────────────────────────
export const chatApi = {
  getConversations: () => api.get('/conversations/'),
  getMessages: (convId: string) => api.get(`/conversations/${convId}/messages/`),
  sendMessage: (convId: string, content: string, msgType = 'text') =>
    api.post(`/conversations/${convId}/messages/send/`, { content, msg_type: msgType }),
};

// ─── Streaks ─────────────────────────────────────────────
export const streakApi = {
  getMyStreaks: () => api.get('/streaks/'),
};
