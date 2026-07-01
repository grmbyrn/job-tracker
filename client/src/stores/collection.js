import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api/client.js';

// Placeholder collection store shared by contacts/applications/companies.
// Phase 5 only needs to prove the authenticated API layer works end to end;
// per-entity create/update/stage-transition actions land in Phase 6.
export function defineCollectionStore(id, path) {
  return defineStore(id, () => {
    const items = ref([]);
    const loading = ref(false);
    const error = ref(null);

    async function fetchAll() {
      loading.value = true;
      error.value = null;
      try {
        const { data } = await api.get(path);
        items.value = Array.isArray(data) ? data : (data.items ?? []);
      } catch (e) {
        error.value = e;
      } finally {
        loading.value = false;
      }
    }

    return { items, loading, error, fetchAll };
  });
}
