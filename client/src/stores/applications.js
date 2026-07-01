import { defineStore } from 'pinia';
import api from '../api/client.js';
import { useCollection } from './collection.js';

export const useApplicationsStore = defineStore('applications', () => {
  const { items, loading, error, fetchAll, upsert, removeById } = useCollection(
    '/applications',
    'applications',
  );

  async function create(payload) {
    const { data } = await api.post('/applications', payload);
    upsert(data.application);
    return data.application;
  }

  async function setStatus(id, status) {
    const { data } = await api.patch(`/applications/${id}`, { status });
    upsert(data.application);
    return data.application;
  }

  async function remove(id) {
    await api.delete(`/applications/${id}`);
    removeById(id);
  }

  return { items, loading, error, fetchAll, create, setStatus, remove };
});
