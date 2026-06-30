# Phase 3 — Core REST API

> Spec for roadmap Phase 3. See [roadmap.md](../roadmap.md) for the big picture.
> Specs chain via **Depends on** ← previous *Provides* and **Provides** → next *Depends on*.

| Field        | Value                                                        |
| ------------ | ----------------------------------------------------------- |
| Status       | In progress (2026-06-29)                                    |
| Branch       | `feature/rest-api`                                          |
| Roadmap ref  | Phase 3                                                     |
| Depends on   | Phase 2 (`requireAuth` → `req.userId`), Phase 1 (Prisma models) |
| Blocks       | Phase 4 (import), Phase 5/6 (frontend consumes these routes) |

## Goal

Full, user-scoped CRUD for every entity (Companies, Contacts, Activities,
Applications), built on the `requireAuth` middleware + `req.userId` from Phase 2,
with centralized error handling, request validation, and the prototype's
follow-up business logic ported into reusable server helpers.

## Depends on (inputs)

- `requireAuth` middleware + `req.userId` at
  [server/src/auth/middleware.js](../../server/src/auth/middleware.js) (Phase 2).
- Prisma models `Company`, `Contact`, `Activity`, `Application` and the `Lane`,
  `Channel`, `Stage`, `AppStatus` enums (Phase 1).
- Shared `PrismaClient` at [server/src/db.js](../../server/src/db.js).
- Express 5 app in [server/src/index.js](../../server/src/index.js).
- Prototype business logic in the root `index.html` (`isDue`, `daysLeft`,
  `waitFor`, lane timers, 7-day message timer, 3-contact goal).

## Scope

- Install `zod` for request validation.
- **Domain helpers** ([server/src/domain/followup.js](../../server/src/domain/followup.js)):
  port `daysSince`, `waitFor`, `daysLeft`, `isDue`, the default lane timers,
  the 7-day message follow-up constant, and the 3-contact goal.
- **HTTP infra** ([server/src/lib/http.js](../../server/src/lib/http.js)):
  `asyncHandler`, `ApiError`, a `notFound` 404 handler, and a centralized
  `errorHandler` (maps Prisma + zod + `ApiError` to clean JSON).
- **Validation** ([server/src/lib/validate.js](../../server/src/lib/validate.js)):
  a `validate(schema)` middleware that parses/normalizes `req.body` with zod and
  returns 400 with field issues on failure.
- **Routes** (all behind `requireAuth`, all filtered by `req.userId`):
  - Companies: `GET/POST /api/companies`, `GET/PATCH/DELETE /api/companies/:id`
    (each company carries a **derived** `contactedCount` + nested contacts on
    the detail route).
  - Contacts: `GET/POST /api/contacts`, `GET/PATCH/DELETE /api/contacts/:id`,
    plus a pipeline transition `PATCH /api/contacts/:id/stage` that stamps
    `firstDate`/`lastDate`, resets `followups`, and logs an `Activity`; and a
    `POST /api/contacts/:id/followup` that bumps `followups` + `lastDate`.
    Each contact carries derived `daysLeft` + `isDue`.
  - Activities: `GET/POST /api/contacts/:id/activities`,
    `DELETE /api/activities/:id`.
  - Applications: `GET/POST /api/applications`,
    `GET/PATCH/DELETE /api/applications/:id`.

### Out of scope

- Settings model / configurable timers UI — Phase 3 uses the default timers as
  server constants (helpers already accept a `timers` arg for Phase 6).
- Data import from the prototype backup (Phase 4).
- Any frontend (Phase 5/6).
- Pagination, full-text search/filter (Phase 7), tests + hardening (Phase 8).

## Tasks

- [x] `npm i -w server zod`.
- [x] Domain helpers ported from the prototype, working on Prisma `Contact`
      records (`stage` field, `DateTime` dates).
- [x] `asyncHandler` + `ApiError` + centralized `errorHandler` + `notFound`.
- [x] `validate(schema)` middleware + zod schemas per entity (create/update).
- [x] Companies router (CRUD, ownership checks, derived contacted count).
- [x] Contacts router (CRUD + stage transition + followup, derived timers).
- [x] Activities router (nested list/create under a contact, delete by id).
- [x] Applications router (CRUD, ownership checks).
- [x] Mount all routers behind `requireAuth`; add `notFound` + `errorHandler`
      last in [server/src/index.js](../../server/src/index.js).

## Decisions to make here

- **Validation tool:** `zod` (over `express-validator`) — schema-first,
  composable, and reusable later by the client. Deferred from Phase 2.
- **"Contacted" count is derived** (roadmap locked): a company's progress is the
  count of its linked contacts whose `stage` is past `hit` (i.e. outreach
  started), not the legacy manual `Company.contacted` integer.
- **Stage transition shape:** a dedicated `PATCH /:id/stage` (not a free `PATCH`
  on `stage`) so the side effects (date stamps, followup reset, activity log)
  are explicit and atomic in a transaction.
- **Timers:** default lane timers + 7-day message timer live as server constants
  now; helpers take an optional `timers` arg so per-user settings drop in later.

## Acceptance criteria

- [x] Every route is mounted behind `requireAuth` and filters by `req.userId`;
      requesting another user's resource returns 404 (not 403, to avoid leaking
      existence).
- [x] Invalid bodies return 400 with field-level issues; unknown ids 404.
- [x] A stage transition stamps dates, resets `followups`, and writes an
      `Activity` row in one transaction.
- [x] Contacts come back with derived `daysLeft` + `isDue`; companies with a
      derived `contactedCount`.
- [x] A curl run exercises every route successfully (see Implementation notes).
- [x] Lint + format clean; client `npm run build` still passes.

### Implementation notes

- **Module layout:** `server/src/domain/followup.js` (ported business logic),
  `server/src/lib/http.js` (`asyncHandler`/`ApiError`/`notFound`/`errorHandler`),
  `server/src/lib/validate.js` (zod middleware), `server/src/validation/schemas.js`,
  and one router per entity under `server/src/routes/`.
- **Ownership pattern:** writes use `updateMany`/`deleteMany` filtered by
  `{ id, userId }` (atomic scope check) and 404 when `count === 0`; reads use
  `findFirst({ where: { id, userId } })`. A contact's `companyId` is verified to
  belong to the requester before create/update.
- **Stage transition:** `PATCH /contacts/:id/stage` runs the update + activity
  log in one `prisma.$transaction`; entering `sent`/`contacted` stamps
  `firstDate`/`lastDate` and resets `followups` (mirrors the prototype).
- **Dropped the prototype's free-text contact `note`** — the `Contact` model has
  no `note` field (the activity timeline replaces it, per the roadmap), so it is
  not accepted on the contact body; notes are `POST .../activities` with
  `type: "note"`.
- **Errors:** `errorHandler` maps `ApiError`, `ZodError`, and Prisma `P2025`/
  `P2003` to clean JSON; everything else → generic 500 (logged, not leaked).

## Provides (outputs for later phases)

- A complete user-scoped REST surface → **Phase 4** import script writes through
  these models; **Phase 5/6** frontend stores/views consume these endpoints.
- Reusable `domain/followup.js` helpers → **Phase 6** countdown pills/settings
  and **Phase 7** reminder cron reuse `isDue`/`daysLeft`.

## Notes / open questions

- Configurable per-user timers (Settings) intentionally deferred; revisit when
  building the Phase 6 settings UI.
