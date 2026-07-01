import { describe, it, expect } from 'vitest';
import { registerUser, authed } from './helpers.js';

const sampleContact = {
  name: 'Jo Bloggs',
  person: 'Jo',
  personRole: 'Recruiter',
  lane: 'Company',
  channel: 'Email',
};

describe('contacts', () => {
  it('creates a contact and lists it', async () => {
    const { token } = await registerUser();
    const api = authed(token);

    const create = await api.post('/api/contacts').send(sampleContact);
    expect(create.status).toBe(201);
    expect(create.body.contact).toMatchObject({ name: 'Jo Bloggs', stage: 'hit' });

    const list = await api.get('/api/contacts');
    expect(list.status).toBe(200);
    expect(list.body.contacts).toHaveLength(1);
    expect(list.body.contacts[0].id).toBe(create.body.contact.id);
  });

  it('rejects a contact with a missing required field with 400', async () => {
    const { token } = await registerUser();
    const res = await authed(token).post('/api/contacts').send({ name: 'No lane/channel' });
    expect(res.status).toBe(400);
  });

  it('transitions stage, stamping dates and logging an activity', async () => {
    const { token } = await registerUser();
    const api = authed(token);
    const { body } = await api.post('/api/contacts').send(sampleContact);
    const id = body.contact.id;

    const res = await api.patch(`/api/contacts/${id}/stage`).send({ stage: 'sent' });
    expect(res.status).toBe(200);
    expect(res.body.contact.stage).toBe('sent');
    expect(res.body.contact.lastDate).toBeTruthy();
    expect(res.body.contact.followups).toBe(0);

    // The transition logs a status_change activity on the contact's timeline.
    const detail = await api.get(`/api/contacts/${id}`);
    const types = detail.body.contact.activities.map((a) => a.type);
    expect(types).toContain('status_change');
  });

  it('records a follow-up, incrementing the counter', async () => {
    const { token } = await registerUser();
    const api = authed(token);
    const { body } = await api.post('/api/contacts').send(sampleContact);
    const id = body.contact.id;

    const res = await api.post(`/api/contacts/${id}/followup`);
    expect(res.status).toBe(200);
    expect(res.body.contact.followups).toBe(1);
  });

  it('deletes a contact, after which it is not found', async () => {
    const { token } = await registerUser();
    const api = authed(token);
    const { body } = await api.post('/api/contacts').send(sampleContact);
    const id = body.contact.id;

    expect((await api.delete(`/api/contacts/${id}`)).status).toBe(204);
    expect((await api.get(`/api/contacts/${id}`)).status).toBe(404);
  });

  it("does not expose another user's contact", async () => {
    const owner = await registerUser('owner@test.dev');
    const { body } = await authed(owner.token).post('/api/contacts').send(sampleContact);

    const intruder = await registerUser('intruder@test.dev');
    const res = await authed(intruder.token).get(`/api/contacts/${body.contact.id}`);
    expect(res.status).toBe(404);
  });
});
