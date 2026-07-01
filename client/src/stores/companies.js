import { defineStore } from 'pinia';
import api from '../api/client.js';
import { useCollection } from './collection.js';

export const useCompaniesStore = defineStore('companies', () => {
  const { items, loading, error, fetchAll, upsert, removeById } = useCollection(
    '/companies',
    'companies',
  );

  async function create(payload) {
    const { data } = await api.post('/companies', payload);
    // The list endpoint enriches companies with contactsTotal/contactedCount;
    // a freshly created company has none, so default them for the UI.
    upsert({ contactsTotal: 0, contactedCount: 0, ...data.company });
    return data.company;
  }

  async function remove(id) {
    await api.delete(`/companies/${id}`);
    removeById(id);
  }

  return { items, loading, error, fetchAll, create, remove };
});
