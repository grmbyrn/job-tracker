# Phase 9 — Hardening & deployment

> Spec for roadmap Phase 9. See [roadmap.md](../roadmap.md) for the big picture.
> Specs chain via **Depends on** ← previous *Provides* and **Provides** → next *Depends on*.

| Field       | Value                                                              |
| ----------- | ----------------------------------------------------------------- |
| Status      | Completed (2026-07-01) — deployed to prod; smoke test passed; screenshots to add |
| Branch      | `feature/hardening-deployment` (merged to `main`)               |
| Roadmap ref | Phase 9                                                           |
| Depends on  | Phase 6 (feature parity — three views + settings + import/export backed by the API) |
| Blocks      | Phase 7 (new features) and Phase 8 (ADHD/neurodivergent pivot) — both deferred until this is live |

## Goal

Ship it. Take the feature-complete app from Phase 6 and make it production-worthy —
tested, secured, and deployed to a live URL with managed Postgres — so it can be used
and shown for real. End state: a public URL where a new user can register and run the
full outreach → applications → companies flow against a production database.

> **Sequencing note:** the roadmap runs 7 → 8 → 9, but we are **deploying first**.
> Phase 7 (activity timeline, real reminders, search) and Phase 8 (the
> ADHD/neurodivergent-assistive pivot) are additive and layer onto a live app, so they
> are deferred. Getting something deployed now buys real usage, a demoable URL, and a
> production baseline before we build on it.

## Depends on (inputs)

- **Phase 6:** the three fully wired views (outreach `/`, applications `/applications`,
  companies `/companies`) + settings + export/import, all backed by the REST API and
  scoped to the logged-in user. Every prototype action maps to a verified API path.
- **Phase 2 auth:** JWT access (in-memory) + refresh (httpOnly cookie, `path=/api/auth`),
  `requireAuth` → `req.userId`, CORS with `credentials: true` and explicit `CLIENT_ORIGIN`.
- **Phase 3 API infra:** `zod` request validation (`validate(schema)`), centralized
  `errorHandler` mapping `ApiError`/`ZodError`/Prisma errors to clean JSON.
- **Phase 1 Prisma:** `schema.prisma` + migrations, driver-adapter-first (`@prisma/adapter-pg`,
  `DATABASE_URL`), seed script.
- **Phase 0 tooling:** npm workspaces (`client`/`server`), ESLint + Prettier, Docker Compose
  Postgres for local dev, `.env.example` for both apps.

## Scope

- **Tests**
  - API integration tests (Vitest + Supertest) covering auth (register/login/refresh/logout,
    error paths) and the core CRUD + stage-transition flows, run against a test database.
  - A few Vue component tests (Vitest + `@vue/test-utils`) on the highest-value views.
  - Wire `test` scripts (root + workspaces) so CI and local runs are one command.
- **Security pass**
  - `helmet` on the API.
  - Rate limiting on the auth routes (`express-rate-limit`).
  - CORS allowlist driven by env (no wildcard in prod).
  - Confirm input validation everywhere (audit routes against the Phase 3 schemas).
  - Secrets only via env; verify none are committed; document required vars.
- **Production builds & config**
  - Client production build (Vite) with the API base URL from env.
  - Server production start path; environment configs for client + API (dev vs prod).
- **Database (managed)**
  - Provision managed Postgres on the chosen host; run `prisma migrate deploy`.
  - Decide whether to seed a demo user in prod or start empty.
- **Deployment**
  - Deploy the API + DB (Railway/Render/Fly) and the frontend (Vercel/Netlify).
  - Set production env vars (DB URL, JWT secrets, `CLIENT_ORIGIN`/API base, cookie `Secure`).
  - Smoke-test register → login → full flow in production.
- **Docs**
  - Update README with setup, architecture diagram, env vars, and screenshots.

### Out of scope

- **Phase 7 — new features:** activity timeline UI, real reminders (node-cron + email),
  search & filter. Deferred; ships onto the live app later.
- **Phase 8 — ADHD/neurodivergent pivot:** "Now" mode, effort metrics, frictionless
  capture, outreach sprints, templates, gentle nudges. Deferred (stretch goals).
- **CI/CD pipeline** beyond a basic test/build gate — nice-to-have, not required to ship.
- Dashboard/analytics and other stretch ideas from the roadmap.

## Tasks

- [x] Set up the test runner (Vitest) + Supertest and a test-database strategy — chose an
      isolated `test` **schema** in the dev Postgres (derived from `DATABASE_URL`), migrated
      once in `globalSetup`, truncated per-test via `user.deleteMany()` (cascades). Split
      `index.js` into `app.js` (exports `createApp()`, no listener) + `index.js` (listen).
- [x] API integration tests (21): auth flows + error paths, contacts CRUD/stage/followup +
      user-scoping, applications CRUD/status + user-scoping.
- [x] A few client tests (16): `format` utils, `useCollection` composable (guards the Phase 6
      envelope-key fix), and a `LoginView` component test (success redirect + error render).
- [x] Add `helmet`, `express-rate-limit` on auth (20 / 15 min, skipped under test), and an
      env-driven CORS **allowlist** (comma-separated `CLIENT_ORIGIN`, `trust proxy` for prod).
- [x] Audit every route for validation coverage (all mutating routes carry a `validate()`
      zod schema) and confirm no secrets are committed (only `.env.example` is tracked).
- [x] Production build config: client API base URL via `VITE_API_URL` (already env-driven);
      server `start` + `db:deploy` (migrate on release) + `postinstall` (prisma generate) +
      `engines`; `railway.json` (preDeploy migrate, healthcheck) and `client/vercel.json`
      (SPA fallback). Fixed the refresh cookie to `SameSite=None; Secure` in production so
      cross-domain (Vercel↔Railway) auth actually works.
- [x] Provision managed Postgres; run `prisma migrate deploy` against it — Railway Postgres,
      migrations applied on release via `railway.json` preDeploy.
- [x] Deploy API + DB and frontend; set all prod env vars — API + Postgres on Railway
      (`https://job-tracker-production-59e6.up.railway.app`), frontend on Vercel
      (`https://job-tracker-client-rho.vercel.app`). Notes: Railway injects `PORT=8080` (point
      the public domain's target port at 8080); `CLIENT_ORIGIN` must be the bare Vercel origin.
- [x] Smoke-test register → full flow in production — register → login → add contact →
      reload stays authed (confirms the cross-domain `SameSite=None; Secure` refresh cookie).
- [x] Update README (setup, testing, architecture, env vars, deployment steps).
      Screenshots still to add.
- [x] Complete the residual Phase 6 browser click-through — covered by the prod smoke test.

## Decisions to make here

- **Hosting split:** which providers for API+DB vs frontend (Railway/Render/Fly ·
  Vercel/Netlify), and whether API + DB live on the same platform.
- **Cross-origin auth in prod:** the refresh cookie is `SameSite=Lax`, `path=/api/auth`.
  If frontend and API are on different domains, decide between a shared parent domain,
  `SameSite=None; Secure`, or proxying the API under the frontend origin.
- **Test DB strategy:** dedicated test database + `migrate deploy` vs transactional
  rollback per test (faster, more isolated).
- **Prod seed:** ship a demo/login user for showcasing, or start empty.
- **CI:** add a minimal GitHub Actions test/build gate now, or defer.

## Acceptance criteria

- [ ] `npm test` runs green: auth + core API integration tests and a few component tests.
- [ ] Security middleware in place (helmet, auth rate limiting, env-driven CORS allowlist);
      no secrets in the repo; validation confirmed on every route.
- [ ] Production builds succeed for client and server with prod env config.
- [ ] Managed Postgres provisioned and migrated (`prisma migrate deploy`).
- [ ] App is deployed at a live URL; register → login → outreach/applications/companies
      flow works end-to-end in production (smoke-tested).
- [ ] README documents setup, architecture, env vars, and includes screenshots.

## Provides (outputs for later phases)

- A live, tested, secured production app + managed database → **Phase 7** hangs new
  features (timeline, reminders, search) off a deployed baseline, and **Phase 8** builds
  the ADHD/neurodivergent experience on real usage.
- A test harness (Vitest + Supertest) → new phases add tests instead of standing up tooling.
- Production env + deploy pipeline → later phases redeploy rather than re-provision.

## Notes / open questions

- Confirm the residual Phase 6 browser click-through is done against the deployed app so
  parity is verified in prod, not just locally.
- The Phase 6 spec's "Out of scope" line predates the roadmap renumber and refers to
  hardening/deployment as "Phase 8" — this phase (9) is that work.
</content>
</invoke>
