# Phase 0 — Project Setup & Foundations

> Spec for roadmap Phase 0. See [roadmap.md](../roadmap.md) for the big picture.
> Specs chain via **Depends on** ← previous *Provides* and **Provides** → next *Depends on*.

| Field        | Value                                  |
| ------------ | -------------------------------------- |
| Status       | Not started                            |
| Branch       | `feature/project-setup`                |
| Roadmap ref  | Phase 0                                 |
| Depends on   | — (first phase)                        |
| Blocks       | Phase 1 (schema), Phase 5 (frontend)   |

## Goal

A working monorepo skeleton with both apps booting, tooling configured, and
Postgres available locally — so every later phase has somewhere to land.

## Depends on (inputs)

Nothing — this is the starting point. The only existing asset is the prototype
`index.html`, kept for reference and later data migration (Phase 4).

## Scope

- Monorepo with `/client` (Vue) and `/server` (Express).
- Local Postgres via Docker Compose.
- Shared tooling: ESLint, Prettier, `.editorconfig`, `.gitignore`.
- Env var conventions (`.env.example` in both apps).

### Out of scope

- Any schema, models, or migrations (Phase 1).
- Any auth, routes, or UI (Phases 2+).

## Tasks

- [ ] `git init`; create `/client` and `/server` directories.
- [ ] Root `README.md`, `.gitignore`, `.editorconfig`, Prettier + ESLint config.
- [ ] `docker-compose.yml` with a `postgres:16` service + named volume.
- [ ] `client`: `npm create vite@latest client -- --template vue`; app runs on `:5173`.
- [ ] `server`: `npm init -y`; install `express`, `cors`, `dotenv`; minimal
      `GET /api/health` returning `{ ok: true }`; runs on `:3000`.
- [ ] `.env.example` for both apps (DB URL, ports, JWT secret placeholder).
- [ ] Root `package.json` scripts to run client + server together (e.g. `concurrently`).

## Decisions to make here

- Package manager (npm / pnpm) — pick one and stick to it across both apps.
- Docker Postgres vs. local install — **recommend Docker** for parity.

## Acceptance criteria

- [ ] `docker compose up` starts Postgres and it accepts connections.
- [ ] Client dev server renders a blank Vue page without errors.
- [ ] `GET http://localhost:3000/api/health` returns `{ ok: true }`.
- [ ] Lint + format run clean on both apps.

## Provides (outputs for later phases)

- Running Express server + `DATABASE_URL` env → **Phase 1** uses this for Prisma.
- Vite Vue app shell + ported design tokens location → **Phase 5** builds on it.
- `.env` conventions + JWT secret placeholder → **Phase 2** uses for auth.

## Notes / open questions

- _(captured during implementation)_
</content>
