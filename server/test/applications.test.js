import { describe, it, expect } from 'vitest';
import { registerUser, authed } from './helpers.js';

const sampleApplication = {
  company: 'Acme Corp',
  position: 'Frontend Engineer',
  appliedDate: '2026-06-01',
};

describe('applications', () => {
  it('creates an application and lists it', async () => {
    const { token } = await registerUser();
    const api = authed(token);

    const create = await api.post('/api/applications').send(sampleApplication);
    expect(create.status).toBe(201);
    expect(create.body.application).toMatchObject({ company: 'Acme Corp', status: 'applied' });

    const list = await api.get('/api/applications');
    expect(list.body.applications).toHaveLength(1);
  });

  it('rejects an application with no company/appliedDate with 400', async () => {
    const { token } = await registerUser();
    const res = await authed(token).post('/api/applications').send({ position: 'Orphan' });
    expect(res.status).toBe(400);
  });

  it('transitions the application status', async () => {
    const { token } = await registerUser();
    const api = authed(token);
    const { body } = await api.post('/api/applications').send(sampleApplication);

    const res = await api
      .patch(`/api/applications/${body.application.id}`)
      .send({ status: 'interview' });
    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('interview');
  });

  it('deletes an application', async () => {
    const { token } = await registerUser();
    const api = authed(token);
    const { body } = await api.post('/api/applications').send(sampleApplication);

    expect((await api.delete(`/api/applications/${body.application.id}`)).status).toBe(204);
    expect((await api.get(`/api/applications/${body.application.id}`)).status).toBe(404);
  });

  it("does not expose another user's application", async () => {
    const owner = await registerUser('owner@test.dev');
    const { body } = await authed(owner.token).post('/api/applications').send(sampleApplication);

    const intruder = await registerUser('intruder@test.dev');
    const res = await authed(intruder.token).get(`/api/applications/${body.application.id}`);
    expect(res.status).toBe(404);
  });
});
