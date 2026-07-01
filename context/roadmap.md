# Job Tracker — Roadmap: HTML prototype → Vue + Node/Express + Postgres

Migrating the single-file `index.html` prototype into a full-stack web app with
accounts, a real database, and server-side follow-up reminders — and, from
**Phase 8** on, pivoting from a neutral tracker into an assistant built for
ADHD / neurodivergent job-seekers (the app's niche).

## Target stack

| Layer      | Choice                                            |
| ---------- | ------------------------------------------------- |
| Frontend   | Vue 3 (Composition API) + Vite + Vue Router + Pinia |
| Backend    | Node + Express (REST API)                         |
| ORM        | Prisma                                            |
| Database   | PostgreSQL                                        |
| Auth       | JWT (access + refresh), bcrypt for hashing        |
| Reminders  | node-cron scheduled job + email (Nodemailer)      |
| Deployment | Frontend (Vercel/Netlify) · API + DB (Railway/Render/Fly) |

## Scope decisions (locked)

- **Contacts are linked to companies** — `company → has many → contacts`. The
  "3 people contacted" goal is derived from real contacts, not a manual counter.
- **Activity timeline** per contact replaces the single free-text note.
- **Real reminders** — scheduled job emails follow-up reminders when timers expire.
- **Search & filter** across contacts / companies / applications.
- Backend is a **custom Node/Express API** (not Nuxt/Supabase).
- _Out of scope for now:_ dashboard/analytics.

---

## Phase 0 — Project setup & foundations

**Goal:** monorepo skeleton, tooling, version control.

- [ ] `git init`; create repo with `/client` (Vue) and `/server` (Express) folders.
- [ ] Add root `README.md`, `.gitignore`, `.editorconfig`, Prettier + ESLint.
- [ ] Decide local dev: install Postgres locally **or** run it via Docker
      (`docker-compose.yml` with a `postgres` service — recommended for parity).
- [ ] Create `.env.example` files for both client and server.
- [ ] Scaffold the Vue app: `npm create vite@latest client -- --template vue`.
- [ ] Scaffold the server: `npm init`, install `express`, `cors`, `dotenv`.

**Deliverable:** both apps boot ("hello world" API + blank Vue page).

---

## Phase 1 — Database schema & Prisma

**Goal:** model the domain relationally and get migrations running.

- [ ] `npm i prisma @prisma/client`; `npx prisma init`.
- [ ] Design `schema.prisma` (draft below), then `npx prisma migrate dev`.
- [ ] Add seed script (`prisma/seed.js`) with sample data for development.

### Draft schema

```prisma
model User {
  id           String        @id @default(cuid())
  email        String        @unique
  passwordHash String
  createdAt    DateTime      @default(now())
  companies    Company[]
  contacts     Contact[]
  applications Application[]
}

model Company {
  id        String    @id @default(cuid())
  user      User      @relation(fields: [userId], references: [id])
  userId    String
  name      String
  link      String?                       // company page or job ad
  contacted Int       @default(0)         // optional: or derive from contacts
  createdAt DateTime  @default(now())
  contacts  Contact[]
}

enum Lane     { Agency Company Freelance Warm }
enum Channel  { Email LinkedIn Instagram WhatsApp Form InPerson Other }
enum Stage    { hit sent accepted contacted communication }

model Contact {
  id         String     @id @default(cuid())
  user       User       @relation(fields: [userId], references: [id])
  userId     String
  company    Company?   @relation(fields: [companyId], references: [id])
  companyId  String?
  name       String                       // person / org name
  person     String?                      // contact person
  personRole String?                      // their position / role
  link       String?
  lane       Lane
  channel    Channel
  stage      Stage      @default(hit)
  firstDate  DateTime?
  lastDate   DateTime?                     // drives the follow-up countdown
  followups  Int        @default(0)
  createdAt  DateTime   @default(now())
  activities Activity[]
}

model Activity {
  id        String   @id @default(cuid())
  contact   Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  contactId String
  type      String                         // "note" | "status_change" | "followup" | "reply"
  body      String?
  createdAt DateTime @default(now())
}

enum AppStatus { applied interview offer rejected }

model Application {
  id          String    @id @default(cuid())
  user        User      @relation(fields: [userId], references: [id])
  userId      String
  company     String
  position    String?
  link        String?
  note        String?
  appliedDate DateTime
  status      AppStatus @default(applied)
  createdAt   DateTime  @default(now())
}
```

> The follow-up timer config (per-lane days, max follow-ups) can live in a
> `Settings` model keyed by `userId`, or as JSON on the `User`. Keep the
> 7-day message timer as a server constant unless you want it configurable.

**Deliverable:** migrated database + seed data visible in `npx prisma studio`.

---

## Phase 2 — Auth (JWT)

**Goal:** register / login / protected routes.

- [ ] Install `bcrypt`, `jsonwebtoken`.
- [ ] `POST /api/auth/register` — hash password, create user, return tokens.
- [ ] `POST /api/auth/login` — verify, return access + refresh tokens.
- [ ] `POST /api/auth/refresh` — issue new access token from refresh token.
- [ ] Auth middleware — verify access token, attach `req.userId`.
- [ ] Decide token storage: httpOnly cookie (safer) vs. localStorage (simpler).
      **Recommended:** refresh token in httpOnly cookie, access token in memory.
- [ ] Scope **every** query by `req.userId` so users only see their own data.

**Deliverable:** can register, log in, and hit a protected `/api/me` route.

---

## Phase 3 — Core REST API

**Goal:** full CRUD for every entity, all user-scoped.

- [ ] **Companies:** `GET/POST /api/companies`, `GET/PATCH/DELETE /api/companies/:id`
      (include nested contacts + contacted count).
- [ ] **Contacts:** `GET/POST /api/contacts`, `GET/PATCH/DELETE /api/contacts/:id`.
  - [ ] Pipeline transition endpoint or `PATCH` on `stage` that also stamps
        `firstDate`/`lastDate`, resets `followups`, and logs an `Activity`.
- [ ] **Activities:** `GET/POST /api/contacts/:id/activities`,
      `DELETE /api/activities/:id`.
- [ ] **Applications:** `GET/POST /api/applications`,
      `GET/PATCH/DELETE /api/applications/:id`.
- [ ] Centralized error handling + request validation (`zod` or `express-validator`).
- [ ] Port the business logic from the prototype: `isDue`, `daysLeft`, lane
      timers, 7-day message timer — into reusable server helpers.

**Deliverable:** Postman/Thunder collection exercising every route successfully.

---

## Phase 4 — Migrate existing data

**Goal:** don't lose what's in the prototype's localStorage.

- [ ] Reuse the prototype's **Export backup** JSON as the import format.
- [ ] Write a one-off import script / `POST /api/import` that maps:
  - `items` → `Contact` (map `status` → `stage`; old `reply` → `accepted`).
  - `apps` → `Application`.
  - `targets` → `Company` (and optionally link contacts by matching `name`).
  - `timers` → settings.
- [ ] Verify counts and pipeline states match the prototype after import.

**Deliverable:** an exported backup file fully restored into Postgres.

---

## Phase 5 — Vue frontend foundation

**Goal:** app shell, routing, state, API layer, auth flow.

- [ ] Install `vue-router`, `pinia`, an HTTP client (`axios` or `fetch` wrapper).
- [ ] Port the prototype's CSS (design tokens, light/dark) into Vue —
      global stylesheet or a `useTheme` composable.
- [ ] Routes: `/login`, `/register`, `/` (outreach), `/applications`,
      `/companies`; route guard redirects unauthenticated users to `/login`.
- [ ] Pinia stores: `auth`, `contacts`, `applications`, `companies`.
- [ ] API client with auth header injection + 401 → refresh-token retry.

**Deliverable:** login → see empty authenticated app shell with working nav.

---

## Phase 6 — Feature parity with the prototype

**Goal:** the three views behave like today, backed by the API.

- [ ] **People & outreach view:** lane tabs, add form (incl. person + role),
      pipeline groups (hitlist → awaiting → accepted → contacted → in comms),
      countdown pills, and the action buttons that drive stage transitions.
- [ ] **Applications view:** add form, status groups, status transitions.
- [ ] **Target companies view:** add company + link; show contacts linked to it
      and progress toward the 3-contact goal (now derived from real contacts).
- [ ] Settings: follow-up timers UI persisted to the backend.
- [ ] Export/import buttons calling the API (keep JSON backup capability).

**Deliverable:** every prototype action works against the live database.

---

## Phase 7 — New features

**Goal:** the value-add beyond a straight port.

### 7a. Activity timeline
- [ ] Contact detail view/drawer showing a dated activity feed.
- [ ] Add note / log interaction; auto-log stage changes & follow-ups.

### 7b. Real reminders
- [ ] Install `node-cron` + `nodemailer` (use Mailtrap/Ethereal in dev).
- [ ] Daily job: find contacts where the follow-up timer has expired
      (reuse `isDue`) and email the user a digest of who to chase.
- [ ] Per-user toggle for email reminders; avoid duplicate sends (track
      `lastRemindedAt`).

### 7c. Search & filter
- [ ] Search endpoint(s) across contacts/companies/applications
      (Postgres `ILIKE`, or full-text search if it grows).
- [ ] Debounced search bar + filter controls (lane, stage, status) in the UI.

**Deliverable:** timeline visible, a test reminder email arrives, search returns results.

---

## Phase 8 — ADHD / neurodivergent-assistive pivot

**Goal:** turn the tracker from a neutral record-keeper into an *assistant* for
ADHD / neurodivergent job-seekers. Job hunting is uniquely ND-hostile — long
feedback loops, no external deadlines, high rejection volume, all self-directed —
so this phase reduces executive-function load, softens rejection sensitivity (RSD),
and rewards effort over outcomes. **This marks the product pivot and the niche the
app is built around.**

> These are **stretch goals**: each builds on the Phase 5–7 foundation (pipeline,
> `isDue` / `daysLeft`, follow-up timers, activity timeline, reminders) and can ship
> independently, so tackle the highest-leverage ones first. Recommended starting
> point: **8a ("Now" mode)** — the clearest differentiator and the smallest build.

### 8a. "Now" mode — one next action
- [ ] A focus view that surfaces a **single** card ("follow up with Jo at Acme") with
      one primary action (Done) + Snooze — instead of the full pipeline, which is a
      wall of choices that stalls task initiation.
- [ ] Reuse `isDue` + `daysLeft` sorting to pick "the next move"; fall back to the
      oldest hitlist item when nothing is due.
- [ ] Snooze bumps `lastDate` (or a dedicated `snoozedUntil`) so the item drops out
      of "now" for a while without guilt.

### 8b. Effort metrics + gentle rejection handling (RSD)
- [ ] Track and celebrate **actions taken** (messages sent, follow-ups, people added)
      per week — effort, not outcomes (which arrive slowly and are mostly "no").
- [ ] Make rejections low-ceremony: auto-collapse a "closed" group; no red pile.
- [ ] Cap the "follow up now" surface to the top few items so it nudges rather than
      shames when the backlog grows.

### 8c. Frictionless capture (brain dump)
- [ ] A single quick-add box: type a name, hit enter, categorize later — only a name
      required (defer lane/channel), so capturing never gets blocked on decisions.
- [ ] An "inbox" of uncategorized captures to triage when there's energy for it.

### 8d. Outreach sprints (body-doubling / Pomodoro)
- [ ] A bounded focus timer ("chase 3 people in 20 minutes") that turns vague dread
      into a finite, startable task; pairs naturally with "Now" mode.
- [ ] Roll what got done in the sprint into the effort metrics (8b).

### 8e. Message templates / snippets
- [ ] Per-stage / per-channel copyable snippets ("connection accepted → send this")
      so composing from a blank page isn't the blocker.
- [ ] Optional token fill (name, role, company) pulled from the contact.

### 8f. Gentle, time-aware nudges
- [ ] Frame the Phase 7b reminder digest kindly ("3 small things waiting"), never
      "OVERDUE" — avoid the guilt spiral and broken-streak shame.
- [ ] Concrete time language over relative ("by Thursday" instead of "2 days left")
      to counter time-blindness.
- [ ] Per-user tone / intensity setting for nudges.

**Deliverable:** first-run lands in "Now" mode with one clear action; a week of
activity shows an effort summary; rejections stay quiet.

---

## Phase 9 — Hardening & deployment

**Goal:** ship it.

- [ ] Tests: API integration tests (Vitest/Jest + Supertest) for auth + core
      flows; a few component tests on the Vue side.
- [ ] Security pass: helmet, rate limiting on auth, CORS allowlist, input
      validation everywhere, secrets only in env.
- [ ] Production builds; environment configs for client/API.
- [ ] Provision managed Postgres; run `prisma migrate deploy`.
- [ ] Deploy API + frontend; smoke-test register → full flow in prod.
- [ ] Update README with setup, architecture diagram, and screenshots.

**Deliverable:** live URL, working end-to-end, documented.

---

## Suggested build order (dependencies)

```
0 → 1 → 2 → 3 → 4
              ↘
                5 → 6 → 7 → 8 → 9
```

Build the API first (0–4) so the frontend (5–6) has something real to talk to;
layer new features (7) once parity holds; pivot to the ADHD/neurodivergent-assistive
experience (8); harden and deploy last (9).

## Stretch ideas (later)

- Dashboard/analytics (pipeline conversion, response rates).
- Browser/push notifications in addition to email.
- CSV import of LinkedIn connections.
- Tags/labels on contacts.
</content>
</invoke>
