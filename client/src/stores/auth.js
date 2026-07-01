import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api, { setAccessToken, registerAuthHandlers } from '../api/client.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const accessToken = ref(null);
  // `ready` flips true after the first bootstrap so the router guard knows a
  // silent-refresh attempt has already run and it's safe to decide redirects.
  const ready = ref(false);

  const isAuthenticated = computed(() => !!user.value);

  function setSession(token, nextUser) {
    accessToken.value = token;
    setAccessToken(token);
    if (nextUser !== undefined) user.value = nextUser;
  }

  function clear() {
    accessToken.value = null;
    user.value = null;
    setAccessToken(null);
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    setSession(data.accessToken, data.user);
  }

  async function register(email, password) {
    const { data } = await api.post('/auth/register', { email, password });
    setSession(data.accessToken, data.user);
  }

  async function fetchMe() {
    const { data } = await api.get('/me');
    user.value = data.user;
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best-effort; clear local state regardless.
    }
    clear();
  }

  // Cold-load rehydrate: the refresh cookie survives reloads, so try to mint a
  // fresh access token and load the user. Failure just means "not logged in".
  async function bootstrap() {
    try {
      const { data } = await api.post('/auth/refresh');
      setSession(data.accessToken);
      await fetchMe();
    } catch {
      clear();
    } finally {
      ready.value = true;
    }
  }

  // Keep the store in sync when the client refreshes or abandons the session.
  registerAuthHandlers({
    onRefreshed: (token) => {
      accessToken.value = token;
    },
    onAuthFailure: () => {
      clear();
    },
  });

  return {
    user,
    accessToken,
    ready,
    isAuthenticated,
    setSession,
    clear,
    login,
    register,
    fetchMe,
    logout,
    bootstrap,
  };
});
