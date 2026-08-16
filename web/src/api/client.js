import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const ACCESS = 'la_access';
const REFRESH = 'la_refresh';

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS);
  },
  get refresh() {
    return localStorage.getItem(REFRESH);
  },
  set(access, refresh) {
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};

let onAuthFailure = null;
export function setAuthFailureHandler(fn) {
  onAuthFailure = fn;
}

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const t = tokens.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

let refreshing = null;
async function doRefresh() {
  const r = tokens.refresh;
  if (!r) return null;
  try {
    const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: r });
    const d = res.data.data;
    tokens.set(d.accessToken, d.refreshToken);
    return d.accessToken;
  } catch {
    return null;
  }
}

export function normalizeError(error) {
  const d = error.response?.data;
  return {
    message: d?.message || error.message || 'Network error',
    statusCode: d?.statusCode ?? error.response?.status,
    errors: d?.errors ?? [],
  };
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original?.url?.includes('/auth/');
    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      refreshing = refreshing ?? doRefresh();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      tokens.clear();
      if (onAuthFailure) onAuthFailure();
    }
    return Promise.reject(normalizeError(error));
  },
);

/** Backend wraps everything as { success, data } — unwrap to the payload. */
export const unwrap = (res) => res.data.data;
