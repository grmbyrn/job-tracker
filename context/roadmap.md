# Job Tracker — Roadmap: HTML prototype → Vue + Node/Express + Postgres

Migrating the single-file `index.html` prototype into a full-stack web app with
accounts, a real database, and server-side follow-up reminders.

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

## Phase 8 — Hardening & deployment

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
                5 → 6 → 7 → 8
```

Build the API first (0–4) so the frontend (5–6) has something real to talk to;
layer new features (7) once parity holds; harden and deploy last (8).

## Stretch ideas (later)

- Dashboard/analytics (pipeline conversion, response rates).
- Browser/push notifications in addition to email.
- CSV import of LinkedIn connections.
- Tags/labels on contacts.
</content>
</invoke>
