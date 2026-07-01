# Phase 8 — ADHD/ND pivot · Daily Plan & milestone badges (8a)

> Spec for roadmap Phase 8, sub-feature **8a** — the pivot's lead build.
> See [roadmap.md](../roadmap.md) for the big picture (8b–8g follow this).
> Specs chain via **Depends on** ← previous *Provides* and **Provides** → next *Depends on*.

| Field       | Value                                                              |
| ----------- | ----------------------------------------------------------------- |
| Status      | Current                                                           |
| Branch      | `feature/daily-plan` (off `main`)                               |
| Roadmap ref | Phase 8 · 8a                                                     |
| Depends on  | Phase 5 (Vue shell, router, Pinia, API client), Phase 6 (store/collection patterns), Phase 9 (live app + Vitest/Supertest harness + prod deploy) |
| Blocks      | 8c effort metrics (reuses the points/effort surface) and 8g nudges (can reframe a "plan your day" prompt); **not** blocked by the deferred Phase 7 |

## Goal

Kick off the ADHD/neurodivergent pivot with a **Daily Plan**: a checklist that starts empty
each day and **clears at midnight**. The user brain-dumps the tasks they intend to do, then
checks them off — the plan lives on screen instead of in working memory. Clearing the whole
list (**≥1 task added, every task done**) at midnight earns **one point**. Points are
**cumulative** (a missed day adds nothing but never resets) and unlock **milestone badges** at
**1, 5, 10, 30, 50, 75, 100 (+)** days, each shown in its own achievements area.

The design is deliberately shame-free: an empty or half-done day earns nothing but is never
punished, framed as failure, or shown as a broken streak.

## Depends on (inputs)

- **Phase 5/6 frontend:** the Vue app shell + router + Pinia, the API client with
  auth-header injection and 401→refresh retry, and the `defineCollectionStore` /
  `useCollection(path, key)` patterns (data lives under `data[key]`, not `data.items`).
- **Phase 2 auth:** `requireAuth` → `req.userId`; **every** query is scoped by `req.userId`.
- **Phase 3 API infra:** `validate(schema)` zod middleware, `asyncHandler`, `ApiError`,
  `errorHandler` (`ApiError`/`ZodError`/Prisma `P2025`/`P2003`) — reuse these, don't reinvent.
- **Phase 9:** live Railway API + Postgres, Vercel frontend, and the Vitest + Supertest
  harness (isolated `test` schema) to cover the new endpoints.

> Not dependent on Phase 7 (deferred): rollover is evaluated lazily on load, so no
> `node-cron` / email infra is needed to ship this.

## Data model (new)

```prisma
model DailyPlan {
  id          String     @id @default(cuid())
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  date        DateTime   @db.Date       // the user's local calendar day this plan is for
  pointEarned Boolean    @default(false) // set true at finalize if >=1 task and all done
  finalizedAt DateTime?                  // when the day was rolled over / evaluated
  createdAt   DateTime   @default(now())
  tasks       PlanTask[]

  @@unique([userId, date])               // one plan per user per day
}

model PlanTask {
  id        String    @id @default(cuid())
  plan      DailyPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  planId    String
  title     String
  done      Boolean   @default(false)
  doneAt    DateTime?
  order     Int       @default(0)
  createdAt DateTime  @default(now())
}
```

- **Points = `count(DailyPlan where userId = me AND pointEarned = true)`** — derived, so it
  can't drift out of sync with the source of truth. Badges are derived from that count against
  a fixed threshold ladder; no separate counter column on `User`.
- "Clears at midnight" is a **UI** concept — a new day just has no `DailyPlan` yet (or an empty
  one). Past plans are kept as the record used to award/verify points.

## Scope

### Backend
- Migration adding `DailyPlan` + `PlanTask` (both `onDelete: Cascade` from their parent).
- `GET /api/plan/today?date=YYYY-MM-DD` — the client sends its **local** date. Server first
  **finalizes** any of this user's unfinalized plans with `date < today` (award points), then
  returns today's plan (create an empty one on demand) with its tasks (ordered).
- `POST /api/plan/today/tasks` `{ title }` — add a task to today's plan (create the plan if
  absent). Title required/non-empty via zod.
- `PATCH /api/plan/tasks/:id` `{ done?, title?, order? }` — toggle done (stamp/clear `doneAt`),
  rename, reorder; user-scoped via the parent plan's `userId`.
- `DELETE /api/plan/tasks/:id` — user-scoped delete.
- `GET /api/plan/progress` — `{ points, ladder: [{ threshold, earned }], nextMilestone }`.
- **Finalize logic** (`server/src/domain/dailyPlan.js`): a plan qualifies (`pointEarned = true`)
  iff, at finalize time, it has **≥1 task and zero incomplete tasks**; always set `finalizedAt`
  (even when it doesn't qualify) so it isn't re-evaluated. Idempotent — never double-award.

### Frontend
- New route + nav entry (`/plan`, e.g. "Today"). A `plan` Pinia store holds today's plan,
  tasks, points, and the badge ladder.
- **Checklist UI:** a quick-add box (type + Enter to add — aligns with 8d capture), tasks with
  checkboxes, inline edit + delete, and an encouraging "all clear" state when the list is empty
  of unchecked items.
- **Achievements area:** the badge ladder (1/5/10/30/50/75/100, then +50 to 1000, then +1000),
  earned badges lit and locked
  ones dimmed, the next milestone's progress ("2 more cleared days → your 5-day badge"), and a
  gentle celebration when a new badge unlocks.
- Kind, concrete, non-punishing copy throughout; no red/overdue/streak-broken framing.

## Tasks

- [ ] Prisma migration for `DailyPlan` + `PlanTask`; regenerate client.
- [ ] `domain/dailyPlan.js` finalize/award helper (pure, unit-testable) + progress/ladder helper.
- [ ] `planRouter`: `GET /plan/today`, `POST /plan/today/tasks`, `PATCH/DELETE /plan/tasks/:id`,
      `GET /plan/progress` — all `requireAuth`, user-scoped, zod-validated.
- [ ] `plan` Pinia store + `/plan` view: quick-add, check/uncheck/edit/delete, empty-day start.
- [ ] Achievements area: badge ladder, next-milestone progress, unlock celebration.
- [ ] Supertest coverage of finalize/award (empty, partial, full, idempotent, missed-day) +
      task CRUD user-scoping; a component test on the checklist. Lint/format + build clean.

## Resolved decisions

- **Whose "midnight"? — client's midnight.** The client sends its **local date** (`?date=`);
  the day resets and points finalize on the **client's** calendar rollover, lazily on load —
  no server timezone. Trade-off: a user who never opens the app isn't awarded until they
  return (acceptable). A per-user timezone + nightly job can come later (ties into 8g).
- **What counts as "cleared" — ≥1 task in the list, all completed at midnight.** A day where
  the user added tasks, completed them, then **deleted** them all → 0 tasks → **no point**
  (matches "put something in and complete it").
- **Badge ladder — generated, unbounded:** `1, 5, 10, 30, 50, 75, 100`, then **+50** through
  1000 (`150, 200, … 1000`), then **+1000** without end (`2000, 3000, …`). "Earned" =
  `points >= threshold`; next milestone = smallest threshold `> points`. One config helper.
- **Lazy finalize vs cron:** lazy-on-load now (no Phase 7 infra); a nightly cron is a later
  optimization, not required.
- **Points storage:** derived from `count(pointEarned)` — no cached counter on `User`
  (can't drift); revisit only if it ever shows up as a hot path.
- **Editing past days:** out of scope — only today's plan is mutable; finalized days are frozen.

## Acceptance criteria

- [ ] Plan starts **empty** each new day; tasks add/check/uncheck/edit/delete and persist,
      strictly user-scoped (another user's task id 404s).
- [ ] A day with **≥1 task all done** awards **exactly one** point at rollover; an empty or
      partly-done day awards **none**; finalize is idempotent (no double-award on repeat loads);
      a missed day never reduces points or badges.
- [ ] Cumulative points render the badge ladder (1/5/10/30/50/75/100…); the next milestone shows
      progress; unlocking a badge celebrates gently; no streak/overdue/shame framing anywhere.
- [ ] New endpoints + finalize logic covered by tests; lint/format clean; client build passes.

## Provides (outputs for later phases)

- A **points / effort surface** and per-day completion record → **8c** effort metrics build on
  it (actions-taken celebration) and can join it with outreach activity.
- A **"plan your day" entry point** → **8g** can add a kind, time-aware nudge to plan/clear the
  list; **8d** capture shares the quick-add pattern.

## Notes / open questions

- DST / clocks-change days: lazy client-date finalize sidesteps most of it; document the edge.
- No retroactive backfill of points for days before this ships — points start accruing from
  launch (call this out in the achievements UI so it doesn't read as lost progress).
- Badge artwork/assets are TBD; ship with simple styled chips first, art later.
