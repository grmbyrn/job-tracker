import { describe, it, expect } from 'vitest';
import { registerUser, authed } from './helpers.js';
import { prisma } from '../src/db.js';

const TODAY = '2026-07-01';

// UTC-midnight Date for a YYYY-MM-DD string (matches the route's @db.Date mapping).
const dateOnly = (str) => new Date(`${str}T00:00:00.000Z`);

// Seed a finalized-candidate plan directly in the DB with the given task done-flags.
function seedPastPlan(userId, date, doneFlags) {
  return prisma.dailyPlan.create({
    data: {
      userId,
      date: dateOnly(date),
      tasks: { create: doneFlags.map((done, i) => ({ title: `task ${i}`, done })) },
    },
  });
}

describe('daily plan', () => {
  it('starts empty each day and adds/lists tasks', async () => {
    const { token } = await registerUser();
    const api = authed(token);

    const empty = await api.get(`/api/plan/today?date=${TODAY}`);
    expect(empty.status).toBe(200);
    expect(empty.body.plan.tasks).toHaveLength(0);

    const add = await api.post('/api/plan/today/tasks').send({ date: TODAY, title: 'Email Jo' });
    expect(add.status).toBe(201);
    expect(add.body.task).toMatchObject({ title: 'Email Jo', done: false });

    const list = await api.get(`/api/plan/today?date=${TODAY}`);
    expect(list.body.plan.tasks).toHaveLength(1);
  });

  it('rejects a task with no title (400) and a bad date (400)', async () => {
    const { token } = await registerUser();
    const api = authed(token);
    expect((await api.post('/api/plan/today/tasks').send({ date: TODAY })).status).toBe(400);
    expect((await api.get('/api/plan/today?date=nope')).status).toBe(400);
  });

  it('toggles, edits, and deletes a task', async () => {
    const { token } = await registerUser();
    const api = authed(token);
    const { body } = await api.post('/api/plan/today/tasks').send({ date: TODAY, title: 'a' });
    const id = body.task.id;

    const done = await api.patch(`/api/plan/tasks/${id}`).send({ done: true });
    expect(done.body.task.done).toBe(true);
    expect(done.body.task.doneAt).not.toBeNull();

    const renamed = await api.patch(`/api/plan/tasks/${id}`).send({ title: 'b' });
    expect(renamed.body.task.title).toBe('b');

    expect((await api.delete(`/api/plan/tasks/${id}`)).status).toBe(204);
    expect((await api.get(`/api/plan/today?date=${TODAY}`)).body.plan.tasks).toHaveLength(0);
  });

  it('awards exactly one point for a fully-cleared past day, and is idempotent', async () => {
    const { token, user } = await registerUser();
    const api = authed(token);
    await seedPastPlan(user.id, '2026-06-30', [true, true]);

    // Loading today rolls the previous day over and awards its point.
    await api.get(`/api/plan/today?date=${TODAY}`);
    expect((await api.get('/api/plan/progress')).body.points).toBe(1);

    // Re-loading must not double-award.
    await api.get(`/api/plan/today?date=${TODAY}`);
    expect((await api.get('/api/plan/progress')).body.points).toBe(1);
  });

  it('awards no point for an empty or partly-done past day', async () => {
    const { token, user } = await registerUser();
    const api = authed(token);
    await seedPastPlan(user.id, '2026-06-29', []); // nothing added
    await seedPastPlan(user.id, '2026-06-30', [true, false]); // one left undone

    await api.get(`/api/plan/today?date=${TODAY}`);
    expect((await api.get('/api/plan/progress')).body.points).toBe(0);
  });

  it('builds the milestone ladder from cumulative points', async () => {
    const { token, user } = await registerUser();
    const api = authed(token);
    // Seed five already-finalized, earned days (skip the rollover path).
    for (let d = 1; d <= 5; d += 1) {
      await prisma.dailyPlan.create({
        data: {
          userId: user.id,
          date: dateOnly(`2026-06-0${d}`),
          pointEarned: true,
          finalizedAt: new Date(),
        },
      });
    }
    const res = await api.get('/api/plan/progress');
    expect(res.body.points).toBe(5);
    expect(res.body.nextMilestone).toBe(10);
    // 1 and 5 earned, next locked rung is 10.
    expect(res.body.ladder).toEqual([
      { threshold: 1, earned: true },
      { threshold: 5, earned: true },
      { threshold: 10, earned: false },
    ]);
  });

  it("does not expose or mutate another user's task", async () => {
    const owner = await registerUser('owner@test.dev');
    const { body } = await authed(owner.token)
      .post('/api/plan/today/tasks')
      .send({ date: TODAY, title: 'secret' });

    const intruder = await registerUser('intruder@test.dev');
    const api = authed(intruder.token);
    expect((await api.patch(`/api/plan/tasks/${body.task.id}`).send({ done: true })).status).toBe(
      404,
    );
    expect((await api.delete(`/api/plan/tasks/${body.task.id}`)).status).toBe(404);
  });
});
