# Current feature

**New features — Phase 7** (Not started)

> Spec: [features/phase-7-new-features.md](features/phase-7-new-features.md) ·
> Roadmap: [roadmap.md](roadmap.md) (Phase 7)

## Goal

The value-add beyond a straight port, layered onto the now-live app: an activity timeline
per contact, real follow-up reminders (scheduled job + email), and search/filter across the
data. End state: a user can see a dated history on each contact, receive a gentle email
digest of who to chase, and find records fast.

## Branch

`feature/new-features` (off `main`).

## Scope (this feature)

- **7a. Activity timeline:** contact detail view/drawer showing a dated activity feed;
  add note / log interaction; stage changes and follow-ups already auto-log (Phase 3),
  so this mostly surfaces `Activity` rows and adds the note-entry UI.
- **7b. Real reminders:** `node-cron` daily job that finds contacts whose follow-up timer
  has expired (reuse `isDue`) and emails the user a digest; `nodemailer` (Mailtrap/Ethereal
  in dev); per-user toggle; track `lastRemindedAt` to avoid duplicate sends.
- **7c. Search & filter:** search endpoint(s) across contacts/companies/applications
  (Postgres `ILIKE`); debounced search bar + filter controls (lane, stage, status) in the UI.

## Acceptance criteria

- [ ] Contact detail surfaces a dated activity timeline; adding a note logs an `Activity`.
- [ ] A scheduled job emails a follow-up digest for due contacts (test email arrives);
      per-user toggle honored; no duplicate sends.
- [ ] Search returns matching contacts/companies/applications; filters narrow the lists.
- [ ] Tests cover the new endpoints; lint/format + build clean.

# History

- 2026-07-01 — **Hardening & deployment — Phase 9** (Completed). Shipped the Phase 6
  parity build to production, deploy-first (Phases 7–8 deferred). **Tests:** stood up
  Vitest — 21 server integration tests (Supertest) for auth (+ error paths), contacts
  CRUD/stage/followup, and applications, all with user-scoping checks, run against an
  isolated `test` **schema** in the dev Postgres (derived from `DATABASE_URL`, migrated
  once in `globalSetup`, truncated per-test via cascading `user.deleteMany()`); plus 16
  client tests (Vitest + @vue/test-utils/jsdom) covering `format` utils, the `useCollection`
  composable (guards the Phase 6 envelope-key fix), and `LoginView`. Split `index.js` into
  `app.js` (`createApp()`, no listener) + a thin entry so Supertest can import the app.
  **Security:** `helmet`, `express-rate-limit` on `/api/auth` (skipped under test), and an
  env-driven CORS **allowlist** (comma-separated `CLIENT_ORIGIN`, `trust proxy`); validation
  audit confirmed every mutating route carries a `validate()` zod schema; no secrets tracked.
  **Prod config:** client already env-driven via `VITE_API_URL`; added `db:deploy`
  (migrate on release), `postinstall` (prisma generate), `engines`, `railway.json`
  (preDeploy migrate + `/api/health` check), and `client/vercel.json` (SPA fallback for
  Vue Router history mode). **Fixed a real cross-domain bug:** the refresh cookie is now
  `SameSite=None; Secure` when `NODE_ENV=production`, so the Vercel↔Railway session
  survives reloads. **Deployed:** API + managed Postgres on **Railway**
  (`https://job-tracker-production-59e6.up.railway.app`), frontend on **Vercel**
  (`https://job-tracker-client-rho.vercel.app`); prod smoke test passed (register → login →
  add contact → reload stays authed). Deploy gotchas captured: Railway injects `PORT=8080`
  (point the domain's target port at 8080) and `CLIENT_ORIGIN` must be the bare origin.
  README updated with testing/architecture/deployment; screenshots still to add. Tests,
  lint, format, and build all clean. Spec:
  [features/phase-9-hardening-deployment.md](features/phase-9-hardening-deployment.md).

- 2026-07-01 — **Feature parity with the prototype — Phase 6** (Completed — API verified
  end-to-end; one residual live-UI browser click-through pending). Filled the Phase 5 shell
  so the three views behave like the `index.html` prototype, backed by the live API and
  scoped per user. **Contacts store** gained mutating actions (create, `setStage`,
  `followup`, `addNote`, delete) over the Phase 3 endpoints, and the Phase 5 `fetchAll`
  bug was fixed by turning `collection.js` into a `useCollection(path, key)` composable
  that reads `data[key]` (not `data.items`) and keeps lists in sync via `upsert`/`removeById`
  (refetch-on-mutation, not optimistic). **Outreach view** (`/`): lane tabs (Agency/Company/
  Freelance/Warm), add form (person + role + optional company link + channel), pipeline
  groups (hitlist → awaiting → accepted → contacted → in comms mapped from the `Stage`
  enum), countdown pills from the API's derived `daysLeft`/`isDue`, and stage/follow-up
  action buttons. **Applications view** (`/applications`): add form, `AppStatus` groups,
  status transitions. **Companies view** (`/companies`): add company + link, linked-contacts
  list, 3-contact progress from derived `contactedCount`. **Settings:** chose **JSON on
  `User`** (`followupTimers` column, migration `add_user_followup_timers`) over a separate
  model; added `GET/PUT /api/settings`, a `contactsRouter` middleware that loads `req.timers`
  once per request so every derived `daysLeft`/`isDue` reflects the user's settings, a timers
  UI + store, and made Phase 4 import persist a backup's `timers` (dropping the no-op echo).
  A contact add-form note is logged as the first `note` activity (surfaced in Phase 7).
  **Export/import** live in the app-shell toolbar; import uses a confirm to pick `replace`
  vs `merge`, then refetches every store. Lint/format clean; client `npm run build` passes;
  API verified end-to-end via a Node script (settings persist + drive daysLeft/isDue;
  follow-up cap; derived company counts; app transitions; import persists timers). Shipped
  to `main` via PR #5 (branch `feature/feature-parity`). Spec:
  [features/phase-6-feature-parity.md](features/phase-6-feature-parity.md).

- 2026-07-01 — **Vue frontend foundation — Phase 5** (Completed). Stood up the Vue
  app shell so the frontend can talk to the Phase 2–4 API. Added `vue-router`, `pinia`,
  and `axios` to the `client` workspace. A single API client (`src/api/client.js`) holds
  the access token in a module var (not `localStorage`), injects it as
  `Authorization: Bearer …`, sends credentials so the refresh cookie rides along, and on
  a `401` runs a **single-flight** `refreshAccessToken()` against `/api/auth/refresh`
  (bare `axios` to dodge interceptor recursion) before replaying the original request —
  auth routes excluded so a bad login stays a 401. The `auth` store mirrors the token and
  `bootstrap()`s once on cold load (silent refresh + `GET /api/me`) so a reload doesn't
  bounce a logged-in user; `contacts`/`applications`/`companies` share a
  `defineCollectionStore(id, path)` factory (state + `fetchAll`, mutations deferred to
  Phase 6). Router wires `/login`, `/register`, `/` (outreach), `/applications`,
  `/companies` with a global guard that redirects unauthenticated users to `/login` and
  keeps authed users out of the auth routes. Ported the prototype's CSS tokens +
  light/dark theme (`style.css` + a `useTheme` composable, auto → light → dark toggled
  from the header) and built the app-shell nav (`App.vue`) with empty view placeholders.
  Lint/format clean, client `npm run build` passes; login → authed shell still pending a
  live run with server + Postgres up. Shipped to `main` as commit `ace2d6d` (branch
  `feature/frontend-foundation`). Spec:
  [features/phase-5-frontend-foundation.md](features/phase-5-frontend-foundation.md).

- 2026-07-01 — **Migrate existing data — Phase 4** (Completed). Restored the
  prototype's localStorage "Export backup" JSON into Postgres via a user-scoped
  `POST /api/import?mode=merge|replace` behind `requireAuth` (scoped by `req.userId`),
  accepting the prototype's verbatim `{ items, apps, targets, timers }` backup. Mapping:
  `targets` → `Company`, `items` → `Contact` (`status` → `stage`, legacy `reply` →
  `accepted`, free-text `note` → a `note` `Activity`), `apps` → `Application`; contacts
  linked to companies by matching `name`, with the whole import running in one
  transaction. `mode=replace` is a clean restore, `mode=merge` appends; `timers` are
  echoed back but not persisted (no Settings model until Phase 6). Verified end-to-end
  via curl and the Postman collection — counts + pipeline stages match the source;
  lint/format clean, client build passes. Shipped on branch `feature/data-import`
  (PR #4). Spec: [features/phase-4-migrate-data.md](features/phase-4-migrate-data.md).

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
