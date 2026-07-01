import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler, ApiError } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { createPlanTaskSchema, updatePlanTaskSchema, dateOnly } from '../validation/schemas.js';
import { finalizeDuePlans, countPoints, buildLadder, nextMilestone } from '../domain/dailyPlan.js';

export const planRouter = Router();

// 'YYYY-MM-DD' → a UTC-midnight Date for the @db.Date column. The string is the
// client's *local* date, so the stored day matches the user's calendar.
function toDateOnly(str) {
  return new Date(`${str}T00:00:00.000Z`);
}

// Tasks in a stable order: manual `order`, then creation time.
const withTasks = { tasks: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } };

// Get (or create) the user's plan for a given day, with its tasks.
function getOrCreatePlan(userId, dateStr) {
  const date = toDateOnly(dateStr);
  return prisma.dailyPlan.upsert({
    where: { userId_date: { userId, date } },
    update: {},
    create: { userId, date },
    include: withTasks,
  });
}

// Parse the ?date=YYYY-MM-DD query param or 400.
function requireDate(value) {
  const parsed = dateOnly.safeParse(value);
  if (!parsed.success) throw new ApiError(400, 'A valid ?date=YYYY-MM-DD query param is required.');
  return parsed.data;
}

// Load a task owned (via its plan) by the user, or 404.
async function findOwnedTask(id, userId) {
  const task = await prisma.planTask.findFirst({ where: { id, plan: { userId } } });
  if (!task) throw new ApiError(404, 'Task not found.');
  return task;
}

// GET /api/plan/today?date=YYYY-MM-DD — roll over + award points for any earlier
// open days first, then return today's plan (created empty on demand).
planRouter.get(
  '/today',
  asyncHandler(async (req, res) => {
    const dateStr = requireDate(req.query.date);
    await finalizeDuePlans(req.userId, toDateOnly(dateStr));
    const plan = await getOrCreatePlan(req.userId, dateStr);
    res.json({ plan });
  }),
);

// GET /api/plan/progress — cumulative points + the badge ladder.
planRouter.get(
  '/progress',
  asyncHandler(async (req, res) => {
    const points = await countPoints(req.userId);
    res.json({ points, ladder: buildLadder(points), nextMilestone: nextMilestone(points) });
  }),
);

// POST /api/plan/today/tasks — add a task to the given day's plan.
planRouter.post(
  '/today/tasks',
  validate(createPlanTaskSchema),
  asyncHandler(async (req, res) => {
    const { date, title } = req.body;
    const plan = await getOrCreatePlan(req.userId, date);
    const task = await prisma.planTask.create({ data: { planId: plan.id, title } });
    res.status(201).json({ task });
  }),
);

// PATCH /api/plan/tasks/:id — rename / toggle done / reorder.
planRouter.patch(
  '/tasks/:id',
  validate(updatePlanTaskSchema),
  asyncHandler(async (req, res) => {
    await findOwnedTask(req.params.id, req.userId);
    const data = { ...req.body };
    if ('done' in data) data.doneAt = data.done ? new Date() : null;
    const task = await prisma.planTask.update({ where: { id: req.params.id }, data });
    res.json({ task });
  }),
);

// DELETE /api/plan/tasks/:id
planRouter.delete(
  '/tasks/:id',
  asyncHandler(async (req, res) => {
    const { count } = await prisma.planTask.deleteMany({
      where: { id: req.params.id, plan: { userId: req.userId } },
    });
    if (count === 0) throw new ApiError(404, 'Task not found.');
    res.status(204).end();
  }),
);
