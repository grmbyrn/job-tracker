import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api/client.js';
import { DEFAULT_TIMERS } from '../lib/constants.js';

// Per-user follow-up timers, persisted to the backend (`/api/settings`).
export const useSettingsStore = defineStore('settings', () => {
  const timers = ref({ ...DEFAULT_TIMERS });
  const loading = ref(false);
  const error = ref(null);

  async function fetch() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get('/settings');
      timers.value = data.timers;
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  // Persist a partial timer change (merged server-side) and adopt the result.
  async function save(patch) {
    const { data } = await api.put('/settings', { timers: patch });
    timers.value = data.timers;
    return data.timers;
  }

  return { timers, loading, error, fetch, save };
});
