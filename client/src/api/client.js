import axios from 'axios';

// Single axios instance for the whole app. `withCredentials` so the httpOnly
// refresh cookie (scoped to /api/auth by the server) rides along on refresh.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// The access token lives in memory only (never localStorage) — matches the
// Phase 2 design: XSS can't read it, and it's rehydrated on reload via the
// refresh cookie + GET /me. The auth store owns it and mirrors it here.
let accessToken = null;

// Callbacks the auth store registers so state stays in sync when the client
// refreshes a token or gives up on a session.
let handlers = { onRefreshed: () => {}, onAuthFailure: () => {} };

export function setAccessToken(token) {
  accessToken = token || null;
}

export function registerAuthHandlers(next) {
  handlers = { ...handlers, ...next };
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Single-flight refresh: many requests can 401 at once; we only want one call
// to /api/auth/refresh. A bare axios call (not `api`) avoids interceptor
// recursion, and points at the /auth path the refresh cookie is scoped to.
let refreshing = null;

function refreshAccessToken() {
  if (!refreshing) {
    refreshing = axios
      .post(`${import.meta.env.VITE_API_URL}/auth/refresh`, null, {
        withCredentials: true,
      })
      .then((res) => {
        const token = res.data.accessToken;
        setAccessToken(token);
        handlers.onRefreshed(token);
        return token;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    // Retry once on a 401 — but never for the auth routes themselves
    // (login/register/refresh 401s are real failures, not stale tokens).
    const isAuthRoute = config?.url?.includes('/auth/');
    if (response?.status === 401 && config && !config._retry && !isAuthRoute) {
      config._retry = true;
      try {
        const token = await refreshAccessToken();
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      } catch (refreshErr) {
        handlers.onAuthFailure();
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
