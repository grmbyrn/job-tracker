import { ref } from 'vue';
import api from '../api/client.js';

// Shared list state + loader for the entity collection stores (contacts,
// applications, companies). Returns reactive state plus a `fetchAll` that reads
// the array under `key` from the API envelope (e.g. `{ contacts: [...] }`), and
// an `upsert` helper so mutation actions can keep the list in sync in place.
export function useCollection(path, key) {
  const items = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function fetchAll() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get(path);
      items.value = data[key] ?? [];
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  // Replace an item with the same id, or prepend it (newest-first, matching the
  // API's createdAt-desc ordering).
  function upsert(item) {
    const i = items.value.findIndex((x) => x.id === item.id);
    if (i === -1) items.value.unshift(item);
    else items.value[i] = item;
  }

  function removeById(id) {
    items.value = items.value.filter((x) => x.id !== id);
  }

  return { items, loading, error, fetchAll, upsert, removeById };
}
