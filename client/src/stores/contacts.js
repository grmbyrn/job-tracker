import { defineStore } from 'pinia';
import api from '../api/client.js';
import { useCollection } from './collection.js';

export const useContactsStore = defineStore('contacts', () => {
  const { items, loading, error, fetchAll, upsert, removeById } = useCollection(
    '/contacts',
    'contacts',
  );

  // Create a contact. `note`, if present, is logged as the contact's first
  // timeline activity (the model has no note field — notes are activities).
  async function create({ note, ...payload }) {
    const { data } = await api.post('/contacts', payload);
    upsert(data.contact);
    if (note) await addNote(data.contact.id, note);
    return data.contact;
  }

  async function addNote(id, body) {
    await api.post(`/contacts/${id}/activities`, { type: 'note', body });
  }

  // Guided pipeline transition — the server stamps dates / resets followups and
  // logs a status_change activity.
  async function setStage(id, stage) {
    const { data } = await api.patch(`/contacts/${id}/stage`, { stage });
    upsert(data.contact);
    return data.contact;
  }

  async function followup(id) {
    const { data } = await api.post(`/contacts/${id}/followup`);
    upsert(data.contact);
    return data.contact;
  }

  async function remove(id) {
    await api.delete(`/contacts/${id}`);
    removeById(id);
  }

  return { items, loading, error, fetchAll, create, addNote, setStage, followup, remove };
});
