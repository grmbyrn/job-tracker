# Current feature

**Database Schema & Prisma — Phase 1** (Not started)

> Full spec: [features/phase-1-database-schema.md](features/phase-1-database-schema.md) ·
> Roadmap: [roadmap.md](roadmap.md) (Phase 1)

## Goal

Model the domain relationally with Prisma, run the first migration against the
local Postgres, and seed sample data — giving every later phase a real database
and a typed client to talk to.

## Branch

`feature/database-schema` (off `main`).

## Scope (this feature)

- Add Prisma to the `/server` workspace; `prisma init`.
- Author `schema.prisma` for `User`, `Company`, `Contact`, `Activity`,
  `Application` + enums (`Lane`, `Channel`, `Stage`, `AppStatus`).
- Run the initial migration (`prisma migrate dev --name init`).
- Seed script (`prisma/seed.js`) with sample dev data.
- Export a shared `PrismaClient` instance for later phases.

### Out of scope

- Auth / password hashing (Phase 2), REST routes (Phase 3), prototype data
  import (Phase 4), a configurable `Settings` model.

## Acceptance criteria

- [ ] `prisma migrate dev` completes; migration committed under `server/prisma/migrations/`.
- [ ] `npm run db:seed` populates the DB without errors.
- [ ] `prisma studio` shows seeded user, companies, contacts (linked), activities, applications.
- [ ] `prisma generate` runs clean; shared client imports without error.
- [ ] Lint + format clean.

## Open decisions

- `Contact.companyId` on delete → recommend `SetNull`.
- Seed user `passwordHash` is a placeholder until Phase 2.
- Keep follow-up timers as server constants (no `Settings` model yet).

# History

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
