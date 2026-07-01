# Current feature

**Migrate existing data — Phase 4** (Implemented — pending PR)

> Spec: [features/phase-4-migrate-data.md](features/phase-4-migrate-data.md) ·
> Roadmap: [roadmap.md](roadmap.md) (Phase 4)

## Goal

Restore the prototype's localStorage "Export backup" JSON into Postgres so no
outreach/application history is lost in the migration, via a user-scoped
`POST /api/import` built on the Phase 3 models.

## Branch

`feature/data-import` (off `main`).

## Scope (this feature)

- `POST /api/import?mode=merge|replace` behind `requireAuth`, scoped by `req.userId`,
  accepting the prototype's verbatim `{ items, apps, targets, timers }` backup.
- Mapping: `targets` → `Company`, `items` → `Contact` (`status` → `stage`, legacy
  `reply` → `accepted`, free-text `note` → a `note` `Activity`), `apps` → `Application`.
- Link contacts to companies by matching `name`; whole import runs in one transaction.
- `timers` echoed back but not persisted (no Settings model yet — Phase 6).

## Acceptance criteria

- [x] A prototype backup file imports cleanly; counts + pipeline stages match the source.
- [x] Route is behind `requireAuth` and scoped by `req.userId`; `mode=replace` is a
      clean restore, `mode=merge` appends.
- [x] Postman collection exercises the import route successfully; lint/format + client build clean.

_Implemented and verified end-to-end via curl (2026-07-01); pending PR on
`feature/data-import`._

# History

- 2026-07-01 — **Core REST API — Phase 3** (Completed). Full user-scoped CRUD for
  Companies, Contacts, Activities, and Applications, all behind `requireAuth` and
  filtered by `req.userId`. Added `zod` request validation via a `validate(schema)`
  middleware (`server/src/lib/validate.js`) plus per-entity schemas
  (`server/src/validation/schemas.js`), and centralized HTTP infra
  (`server/src/lib/http.js`: `asyncHandler`, `ApiError`, `notFound`, and an
  `errorHandler` mapping `ApiError`/`ZodError`/Prisma `P2025`+`P2003` to clean JSON).
  Contacts carry derived `daysLeft`/`isDue` and companies a derived `contactedCount`
  (count of linked contacts past `hit`), backed by prototype logic ported into
  `server/src/domain/followup.js`. A guided `PATCH /api/contacts/:id/stage` stamps
  `firstDate`/`lastDate`, resets `followups`, and logs a `status_change` `Activity`
  in one transaction; `POST /api/contacts/:id/followup` bumps `followups` + `lastDate`.
  Ownership enforced via `updateMany`/`deleteMany` filtered by `{ id, userId }` (404 on
  `count === 0`) and `findFirst`; a contact's `companyId` is verified owned before
  create/update. The prototype's free-text contact `note` was dropped from the model —
  notes are `Activity` rows (`type: "note"`), which Phase 4 import relies on. Verified
  every route via curl; lint/format clean, client build passes. Shipped on branch
  `feature/rest-api` (PR #3).

- 2026-06-29 — **Auth (JWT) — Phase 2** (Completed). Register/login/refresh/logout
  under `/api/auth` plus a protected `GET /api/me`. `server/src/auth/` holds
  `tokens.js` (JWT sign/verify; separate access+refresh secrets, `JWT_ACCESS_TTL`
  15m / `JWT_REFRESH_TTL` 7d), `middleware.js` (`requireAuth` → `req.userId`,
  401 on any failure), and `routes.js` (the `authRouter`). Access token returned
  in the JSON body (client holds it in memory); refresh token in an `httpOnly`,
  `SameSite=Lax`, `path=/api/auth` cookie (`Secure` in prod). `bcrypt` cost 12;
  inline validation (email regex + min length 8) → 400 bad input, 409 duplicate
  email (`P2002`), generic 401 for bad email/password (with a dummy compare to
  dodge a timing side-channel). Wired `cookie-parser` + CORS `credentials: true`
  with explicit `CLIENT_ORIGIN` for the Phase 5 Vite client. Seed user now carries
  a real bcrypt hash of `SEED_USER_PASSWORD` (`dev@jobtracker.local` /
  `devpassword123`). Refresh rotation deferred to Phase 8. Verified end-to-end via
  curl (register/login/me/refresh/logout + all error paths); lint/format clean,
  client build passes. Shipped on branch `feature/auth`.

- 2026-06-29 — **Database Schema & Prisma — Phase 1** (Completed). Modeled the domain
  in Prisma and got migrations + seed running against local Postgres. `schema.prisma`
  defines `User`, `Company`, `Contact`, `Activity`, `Application` and the `Lane`,
  `Channel`, `Stage`, `AppStatus` enums; on-delete rules cascade a user's
  companies/contacts/applications and a contact's activities, while `Contact → Company`
  is `SetNull`. Initial migration `20260629100019_init` applied; idempotent seed
  (`prisma/seed.js`) creates one dev user (placeholder `passwordHash` until Phase 2) with
  2 companies, 4 contacts (varied lane/channel/stage, one unlinked, one mid-follow-up),
  3 activities, and 2 applications. Shared `PrismaClient` exported from `server/src/db.js`;
  `db:migrate`/`db:seed`/`db:studio` scripts added (server + root). **Prisma 7.8 notes:**
  it is driver-adapter-first (added `@prisma/adapter-pg`, built from `DATABASE_URL`); used
  the legacy `prisma-client-js` generator (the new `prisma-client` generator emits TS —
  wrong fit for a plain-JS ESM server); datasource URL + seed command live in
  `prisma.config.ts`. Verified: `migrate dev`/`generate`/`validate` clean, seed reruns
  idempotently, relations confirmed via query, client connects, lint/format/build clean.
  Shipped on branch `feature/database-schema`.

- 2026-06-29 — **Project Setup & Foundations — Phase 0** (Completed). Initial monorepo
  scaffold using npm workspaces (`client`, `server`): Vue 3 + Vite client (dev `:5173`)
  and an Express 5 server exposing `GET /api/health → { ok: true }` (dev `:3000`). Local
  Postgres 16 via Docker Compose (named volume + healthcheck, host port `5433` to avoid a
  pre-existing local Postgres on `5432`). Shared tooling: ESLint 9 flat config (Node + Vue
  + Prettier), Prettier, `.editorconfig`, `.gitignore`, and `.env.example` for both apps
  (DB URL, ports, JWT secret placeholders). Root scripts for `dev` (concurrently), `build`,
  `db:up`/`db:down`, `lint`, and `format`. Verified: Postgres accepts connections, client
  renders a blank Vue page (HTTP 200), health endpoint returns `{ ok: true }`, and
  lint/format/build all run clean. Shipped on branch `feature/project-setup`.
