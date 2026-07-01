// Daily Plan business logic (Phase 8, 8a). A plan is one user's checklist for a
// single local day; clearing it (>=1 task, all done) earns a cumulative point at
// midnight. Points never reset — a missed day just adds nothing.
import { prisma } from '../db.js';

// Milestone thresholds, in order: the fixed early rungs, then every +50 up to
// 1000, then every +1000 without end. Generated so the ladder isn't hand-listed.
function* milestones() {
  for (const m of [1, 5, 10, 30, 50, 75, 100]) yield m;
  for (let n = 150; n <= 1000; n += 50) yield n;
  for (let n = 2000; ; n += 1000) yield n;
}

// A day qualifies for its point iff it held at least one task and every task is
// done. `tasks` only needs a `done` flag on each row.
export function qualifies(tasks) {
  return tasks.length > 0 && tasks.every((t) => t.done);
}

// The next milestone a user is working toward (smallest threshold above points).
export function nextMilestone(points) {
  for (const threshold of milestones()) if (threshold > points) return threshold;
}

// The badge ladder to render: every earned badge plus the next locked one, so the
// achievements area shows progress without an unbounded list.
export function buildLadder(points) {
  const out = [];
  for (const threshold of milestones()) {
    const earned = threshold <= points;
    out.push({ threshold, earned });
    if (!earned) break;
  }
  return out;
}

// Count of days this user has cleared — the source of truth for points (derived,
// so it can't drift out of sync with a cached counter).
export function countPoints(userId) {
  return prisma.dailyPlan.count({ where: { userId, pointEarned: true } });
}

// Finalize any of the user's still-open plans from before `todayDate`: stamp
// finalizedAt and award the point iff the day qualified. Idempotent — already
// finalized days are skipped, so re-running never double-awards.
export async function finalizeDuePlans(userId, todayDate) {
  const due = await prisma.dailyPlan.findMany({
    where: { userId, finalizedAt: null, date: { lt: todayDate } },
    include: { tasks: { select: { done: true } } },
  });
  if (due.length === 0) return;

  const now = new Date();
  await prisma.$transaction(
    due.map((plan) =>
      prisma.dailyPlan.update({
        where: { id: plan.id },
        data: { finalizedAt: now, pointEarned: qualifies(plan.tasks) },
      }),
    ),
  );
}
