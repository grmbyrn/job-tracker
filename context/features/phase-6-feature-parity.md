# Phase 6 — Feature parity with the prototype

> Spec for roadmap Phase 6. See [roadmap.md](../roadmap.md) for the big picture.
> Specs chain via **Depends on** ← previous *Provides* and **Provides** → next *Depends on*.

| Field       | Value                                                              |
| ----------- | ----------------------------------------------------------------- |
| Status      | Implemented (2026-07-01) — API verified end-to-end; live UI click-through pending |
| Branch      | `feature/feature-parity`                                          |
| Roadmap ref | Phase 6                                                           |
| Depends on  | Phase 5 (app shell, router, `auth` store, authenticated API client) |
| Blocks      | Phase 7 (activity timeline, real reminders, search build on these views) |

## Goal

Fill the Phase 5 shell so the three views behave like the `index.html` prototype does
today, but backed by the live REST API instead of `localStorage`. End state: every
action a user could take in the prototype — adding people/companies/applications,
moving them through the pipeline, editing follow-up timers, exporting/importing a
backup — works against Postgres through the API, scoped to the logged-in user.

## Depends on (inputs)

- **Phase 5 shell:** router (`/`, `/applications`, `/companies`, `/login`, `/register`),
  the `auth` store + guard, and the authenticated API client (`src/api/client.js`) with
  access-token injection + single-flight 401 → refresh-retry.
- **Phase 5 stores:** `contacts` / `applications` / `companies` built on the
  `defineCollectionStore(id, path)` factory (state + `fetchAll`) — this phase adds the
  mutating actions.
- **Phase 3 API:** user-scoped CRUD for companies, contacts, activities, applications;
  the guided `PATCH /api/contacts/:id/stage` (stamps `firstDate`/`lastDate`, resets
  `followups`, logs a `status_change` activity) and `POST /api/contacts/:id/followup`.
  Contacts already carry derived `daysLeft`/`isDue`; companies carry `contactedCount`.
- **Phase 4 API:** `POST /api/import?mode=merge|replace` accepting the prototype's
  `{ items, apps, targets, timers }` backup shape.
- **The prototype (`index.html`):** the source of truth for view layout, lane tabs,
  pipeline groups, countdown-pill copy, forms, and status transitions.

## Scope

- **People & outreach view (`/`):**
  - Lane tabs (Agency / Company / Freelance / Warm) filtering the contacts list.
  - Add-contact form including person + role (`person`, `personRole`), link, lane,
    channel.
  - Pipeline groups in prototype order: hitlist → awaiting → accepted → contacted →
    in comms (mapped from the `Stage` enum: `hit`, `sent`, `accepted`, `contacted`,
    `communication`).
  - Countdown pills driven by the API's derived `daysLeft` / `isDue`.
  - Action buttons that drive stage transitions via `PATCH /api/contacts/:id/stage`
    and follow-ups via `POST /api/contacts/:id/followup`.
- **Applications view (`/applications`):** add form, grouping by `AppStatus`
  (applied / interview / offer / rejected), and status transitions via `PATCH`.
- **Target companies view (`/companies`):** add company + link; list contacts linked
  to each company and show progress toward the 3-contact goal, derived from the API's
  `contactedCount` (not a manual counter).
- **Settings:** a follow-up-timers UI (per-lane days, max follow-ups) persisted to the
  backend. Roadmap flags a `Settings` model keyed by `userId` (or JSON on `User`) as
  the likely home — Phase 4 currently echoes `timers` back without persisting them, so
  a settings endpoint + store lands here.
- **Export/import buttons:** Export downloads the prototype-shaped JSON backup; Import
  posts it to `POST /api/import` (offer `merge` vs `replace`), then refreshes the stores.
- **Store wiring:** add create/update/delete/transition actions to the `contacts`,
  `applications`, and `companies` stores; keep the API client the single place auth +
  refresh live.

### Out of scope

- **Activity timeline UI** (contact detail drawer, dated feed) — **Phase 7a**.
- **Real reminders** (cron + email digests) — **Phase 7b**.
- **Search & filter** endpoints and debounced UI — **Phase 7c** (basic lane/status
  grouping here is view state, not the Phase 7 search/filter feature).
- Tests, security hardening, and deployment — **Phase 8**.

## Tasks

- [x] Add mutating actions to `contacts` store (create, `setStage`, `followup`, `addNote`,
      delete) hitting the Phase 3 endpoints; fixed the Phase 5 `fetchAll` response-key bug
      (read `data[key]`, not `data.items`).
- [x] Outreach view: lane tabs, add form (person + role + optional company link), pipeline
      groups, countdown pills, and stage/follow-up action buttons.
- [x] Applications store actions + view: add form, status groups, status transitions.
- [x] Companies store actions + view: add company + link, linked-contacts list,
      3-contact progress from `contactedCount`.
- [x] Settings: chose **JSON on `User`** (`followupTimers`) over a separate model; added
      `GET/PUT /api/settings`, wired per-user timers into the contacts follow-up
      computations, built the timers UI + store, and made Phase 4 import persist timers
      (dropping the no-op echo).
- [x] Export/import buttons wired to `POST /api/import` (merge/replace via a confirm) +
      backup download in the app-shell toolbar.
- [x] Ported remaining prototype domain copy (labels, empty states) into the views.
- [x] lint/format clean; client `npm run build` passes.
- [x] API verified end-to-end via a Node script (settings persist + drive daysLeft/isDue;
      follow-up cap; derived company counts; app transitions; import persists timers).
- [ ] Live UI click-through in a browser (server + Postgres up) — the one residual check.

## Decisions to make here

- **Where follow-up timer settings live:** a `Settings` model keyed by `userId`, JSON
  on `User`, or a server constant made configurable. Phase 4 already passes `timers`
  through — pick the store and add the migration + endpoint if going relational.
- **Stage ↔ pipeline-group mapping:** confirm the prototype's group order and labels
  map cleanly onto the `Stage` enum (`hit`/`sent`/`accepted`/`contacted`/`communication`)
  and reuse the server's derived `daysLeft`/`isDue` rather than recomputing client-side.
- **Optimistic vs refetch:** update stores optimistically for snappy UX, or refetch the
  affected collection after each mutation. Refetch is simpler and safe for parity; revisit
  if it feels slow.
- **Import UX:** how to expose `merge` vs `replace` and confirm before a destructive
  `replace`.

## Acceptance criteria

- [x] Outreach view renders lane tabs + pipeline groups from the contacts store; the add
      form creates a contact, and stage buttons transition it with correct countdown pills.
- [x] Applications view lists applications by status group, adds new ones, and transitions
      status.
- [x] Companies view adds a company + link, lists linked contacts, and shows 3-contact
      progress derived from real contacts (`contactedCount`).
- [x] Follow-up timers are editable in a settings UI and persisted to the backend
      (survive reload; verified GET/PUT round-trip).
- [x] Export downloads a JSON backup; import restores it via `POST /api/import` (backup
      shape + import round-trip verified).
- [x] Lint/format clean; client `npm run build` passes; every prototype action maps to a
      verified API path _(browser click-through still pending)_.

### Implementation notes

- **Timers home = JSON on `User`.** A `followupTimers Json?` column (migration
  `add_user_followup_timers`) over a separate `Settings` model — less code, and the
  shape can grow without a migration. `domain/settings.js` merges stored timers over
  `DEFAULT_TIMERS`; a `contactsRouter` middleware loads `req.timers` once per request so
  every derived `daysLeft`/`isDue` reflects the user's settings. Phase 4 import now
  persists a backup's `timers` (merged) instead of echoing them back.
- **Stores.** `collection.js` became a `useCollection(path, key)` composable (fixing the
  Phase 5 bug where `fetchAll` read `data.items` for envelopes keyed `contacts`/
  `applications`/`companies`); each store adds mutating actions and keeps the list in
  sync via `upsert`/`removeById` (refetch-on-mutation, not optimistic).
- **Contact notes.** The add form keeps a note field; since the model has no note, a
  provided note is logged as the contact's first `note` activity (surfaced in Phase 7).
- **Company linking.** The outreach add form gained an optional company selector so the
  derived `contactedCount` is populated outside of import.
- **Export/import** live in the app-shell toolbar (`App.vue`); import uses a confirm to
  pick `replace` vs `merge`, then refetches every store.

## Provides (outputs for later phases)

- Fully wired outreach/applications/companies views + stores → **Phase 7** hangs the
  activity timeline off the contact views, the reminders job off the same follow-up
  data, and search/filter controls off the existing lists.
- A follow-up-timer settings store/endpoint → reused by the Phase 7b reminder job.

## Notes / open questions

- Confirm whether the prototype's "3 people contacted" goal counts contacts past `hit`
  (matching the server's `contactedCount`) or some other threshold.
- Decide if `timers` settings should be seeded/migrated for existing users when the
  persistence model lands, so the UI has sensible defaults.
