# Current feature

**Core REST API — Phase 3** (Not started)

> Spec: _to be written_ (`features/phase-3-rest-api.md`) ·
> Roadmap: [roadmap.md](roadmap.md) (Phase 3)

## Goal

Full user-scoped CRUD for every entity (companies, contacts, activities,
applications), built on the `requireAuth` middleware + `req.userId` from Phase 2.

## Branch

`feature/rest-api` (off `main`) — _not yet created_.

## Scope (this feature)

- Companies / Contacts / Activities / Applications CRUD, all scoped by `req.userId`.
- Pipeline transition that stamps `firstDate`/`lastDate`, resets `followups`, logs an `Activity`.
- Centralized error handling + request validation (`zod` or `express-validator`).
- Port prototype business logic (`isDue`, `daysLeft`, lane timers, 7-day message timer) into server helpers.

## Acceptance criteria

- [ ] Every route is mounted behind `requireAuth` and filters by `req.userId`.
- [ ] A collection (Postman/Thunder) exercises every route successfully.

# History

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
