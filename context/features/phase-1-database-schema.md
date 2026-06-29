# Phase 1 — Database Schema & Prisma

> Spec for roadmap Phase 1. See [roadmap.md](../roadmap.md) for the big picture.
> Specs chain via **Depends on** ← previous *Provides* and **Provides** → next *Depends on*.

| Field        | Value                                          |
| ------------ | ---------------------------------------------- |
| Status       | Implemented (pending review/commit)            |
| Branch       | `feature/database-schema`                      |
| Roadmap ref  | Phase 1                                         |
| Depends on   | Phase 0 (running server + `DATABASE_URL`)      |
| Blocks       | Phase 2 (auth), Phase 3 (REST API), Phase 4 (import) |

## Goal

Model the domain relationally with Prisma, run the first migration against the
local Postgres, and seed sample data — so every later phase has a real database
and typed client to talk to.

## Depends on (inputs)

- Running Express server in `/server` and a working `DATABASE_URL` env var
  (Phase 0). Local Postgres is up via `docker compose up` on host port `5433`.
- `server/.env.example` already carries the `DATABASE_URL` Prisma will read.

## Scope

- Add Prisma to the **server** workspace; `prisma init`.
- Author `schema.prisma` for all six models (`User`, `Company`, `Contact`,
  `Activity`, `Application`) and enums (`Lane`, `Channel`, `Stage`, `AppStatus`),
  using the roadmap draft as the starting point.
- Run the initial migration (`prisma migrate dev`) against local Postgres.
- A seed script (`prisma/seed.js`) with representative dev data for one user
  (a few companies, linked contacts across lanes/stages, activities, applications).
- A single shared `PrismaClient` instance the server can import.

### Out of scope

- Auth logic, password hashing, token issuance (Phase 2) — the `passwordHash`
  field exists in the schema, but nothing writes to it yet.
- REST routes / CRUD handlers (Phase 3).
- Importing prototype localStorage data (Phase 4).
- A configurable `Settings` model for follow-up timers — keep timers as server
  constants for now (see open questions).

## Tasks

- [ ] In `/server`: `npm i prisma @prisma/client`; `npx prisma init`
      (generates `prisma/schema.prisma`; keep using the existing `.env`).
- [ ] Point the datasource at `DATABASE_URL`; provider `postgresql`.
- [ ] Transcribe the roadmap draft schema into `schema.prisma`:
      `User`, `Company`, `Contact`, `Activity`, `Application` + the four enums.
- [ ] Add `onDelete` behavior on relations (cascade contacts/activities/
      applications/companies when their owning `User` is deleted; `Activity`
      already cascades from `Contact`). Decide `Contact → Company` on delete
      (set null vs. restrict — see open questions).
- [ ] `npx prisma migrate dev --name init` — creates the migration + applies it.
- [ ] Write `prisma/seed.js`: one dev user + sample companies, contacts (varied
      `lane`/`channel`/`stage`, some with `firstDate`/`lastDate`), a couple of
      activities, and a few applications. Wire up `prisma.seed` in package.json.
- [ ] Add an `npm run db:seed` (and optionally `db:migrate`, `db:studio`) script.
- [ ] Export a shared `PrismaClient` (e.g. `server/src/db.js`) for later phases.

## Decisions to make here

- **Seed user password:** seed writes a placeholder/empty `passwordHash` (real
  hashing arrives in Phase 2). Pick a clearly-fake value and note it.
- **`Contact.companyId` on delete:** `onDelete: SetNull` (keep the contact,
  detach company) vs. `Restrict`. **Recommend `SetNull`** — `companyId` is
  already optional.
- **`Company.contacted` counter:** the roadmap notes it may be derived from
  contacts rather than stored. Keep the column for now (parity with prototype),
  but treat the derived count as the source of truth in Phase 3.

## Acceptance criteria

- [ ] `npx prisma migrate dev` completes; a migration exists under
      `server/prisma/migrations/`.
- [ ] `npm run db:seed` populates the database without errors.
- [ ] `npx prisma studio` shows the seeded user, companies, contacts (linked to
      companies), activities, and applications.
- [ ] `npx prisma generate` runs clean; the shared client imports without error.
- [ ] Lint + format run clean.

## Provides (outputs for later phases)

- Migrated Postgres schema + generated `@prisma/client` → **Phase 2** creates
  users / writes `passwordHash`; **Phase 3** builds CRUD on these models.
- Shared `PrismaClient` instance → imported by every later server module.
- Seed data → a populated DB for developing/testing the API and frontend.

## Notes / open questions

- Follow-up timer config (per-lane days, max follow-ups, 7-day message timer):
  keep as **server constants** for now; revisit a `Settings` model only if the
  UI needs them configurable (roadmap Phase 6).

### Implementation notes (Prisma 7.8)

Prisma 7 differs from the roadmap's assumptions; deviations made:

- **Driver-adapter-first runtime.** Prisma 7 dropped the bundled query engine,
  so `PrismaClient` must be constructed with a driver adapter. Added
  `@prisma/adapter-pg` and build it from `DATABASE_URL` in the shared client
  ([server/src/db.js](../../server/src/db.js)).
- **Generator choice.** `prisma init` scaffolds the new `prisma-client`
  generator, which emits **TypeScript** to `src/generated/prisma`. Since the
  server is plain JS ESM, switched to the legacy `prisma-client-js` generator
  (emits into `node_modules/@prisma/client`, imported as `@prisma/client`) — no
  generated source in the repo, no TS build step.
- **Config + datasource URL.** Lives in `server/prisma.config.ts` (reads
  `DATABASE_URL` via `dotenv/config`); the `datasource` block in
  `schema.prisma` no longer carries a `url`. Seed command is registered under
  `migrations.seed` in that config (`prisma db seed`).
- **On-delete behavior:** `User → Company/Contact/Application` cascade;
  `Contact → Company` is `SetNull` (chosen as recommended); `Activity → Contact`
  cascades.
- Migration `20260629100019_init`; seed at
  [server/prisma/seed.js](../../server/prisma/seed.js) is idempotent (deletes the
  seed user, then recreates the graph).
