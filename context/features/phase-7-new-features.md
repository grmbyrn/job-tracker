# Phase 7 — New features

> Spec for roadmap Phase 7. See [roadmap.md](../roadmap.md) for the big picture.
> Specs chain via **Depends on** ← previous *Provides* and **Provides** → next *Depends on*.

| Field       | Value                                                              |
| ----------- | ----------------------------------------------------------------- |
| Status      | Current                                                           |
| Branch      | `feature/new-features` (off `main`)                              |
| Roadmap ref | Phase 7                                                           |
| Depends on  | Phase 6 (wired views + stores) and Phase 9 (live app, test harness, prod deploy) |
| Blocks      | Phase 8 (the ADHD/neurodivergent pivot builds on the timeline, reminders, and effort data) |

## Goal

The value-add beyond a straight port, layered onto the now-live app. Three independent
features: a per-contact **activity timeline**, **real follow-up reminders** (scheduled job
+ email), and **search & filter** across the data. Each can ship on its own; build in the
order that gives the most value soonest.

## Depends on (inputs)

- **Phase 3 API:** `Activity` rows are already written by the server — `PATCH /contacts/:id/stage`
  logs a `status_change`, `POST /contacts/:id/followup` logs a `followup`, and the contacts
  store's `addNote` logs a `note`. `GET /contacts/:id` already includes `activities`
  (createdAt-desc). Contacts carry derived `daysLeft`/`isDue` from `domain/followup.js`.
- **Phase 6 UI/stores:** the three wired views + collection stores; the per-user follow-up
  timers (`followupTimers` JSON on `User`, `GET/PUT /api/settings`) that drive `isDue`.
- **Phase 9:** live Railway API + Postgres and Vercel frontend; the Vitest + Supertest
  harness (isolated `test` schema) to cover the new endpoints; env-driven config for secrets
  (email creds) and the deploy pipeline (the cron job needs a home — see decisions).

## Scope

### 7a. Activity timeline
- Contact detail view or drawer showing the dated `Activity` feed (note / status_change /
  followup / reply), newest first.
- Add-note UI that calls the existing note path; auto-logged stage changes + follow-ups
  already appear, so this is mostly surfacing + a compose box.

### 7b. Real reminders
- `node-cron` daily job: find contacts where the follow-up timer has expired (reuse
  `isDue` with the user's timers) and email that user a digest of who to chase.
- `nodemailer` with a dev transport (Mailtrap/Ethereal); real provider via env in prod.
- Per-user toggle for email reminders; track `lastRemindedAt` (new field) to avoid
  duplicate sends within a window.

### 7c. Search & filter
- Search endpoint(s) across contacts / companies / applications (Postgres `ILIKE`;
  full-text later if it grows).
- Debounced search bar + filter controls (lane, stage, status) wired into the existing lists.

### Out of scope

- The ADHD/neurodivergent-assistive experience (Now mode, effort metrics, capture inbox,
  sprints, templates, tone-aware nudges) — **Phase 8**. 7b sends a plain digest; the *kind*
  framing/tone work is 8f.
- Dashboard/analytics and push notifications — roadmap stretch ideas.

## Tasks

- [ ] 7a: contact detail drawer/view rendering the activity feed + add-note box; store action.
- [ ] 7b: `node-cron` daily job + `nodemailer`; `isDue` digest query; per-user reminder
      toggle (settings) + `lastRemindedAt` field/migration; dev email transport.
- [ ] 7c: search + filter endpoint(s) (`ILIKE`, user-scoped); debounced search bar + filter
      controls in the views.
- [ ] Tests (Supertest) for search endpoints and the digest query; lint/format + build clean.

## Decisions to make here

- **Where the cron job runs:** in the API process (`node-cron` in-process — simplest, but
  runs per instance) vs a separate Railway cron service / scheduled job. Single instance
  today, so in-process is fine to start; revisit if scaling out.
- **Email provider in prod:** Mailtrap/Ethereal for dev; pick a real sender (Resend, SES,
  Postmark…) for prod and store creds in env.
- **Duplicate-send guard:** `lastRemindedAt` per contact vs a per-user "last digest sent"
  timestamp (simpler — one digest email per user per day).
- **Search scope/UX:** one combined endpoint vs per-entity; whether filters are server-side
  or client-side over already-loaded lists (client-side is enough for current data sizes).

## Acceptance criteria

- [ ] Contact detail surfaces a dated activity timeline; adding a note logs an `Activity`
      and appears immediately.
- [ ] A scheduled job emails a follow-up digest for due contacts (verified test email);
      per-user toggle honored; no duplicate sends.
- [ ] Search returns matching contacts/companies/applications; filters narrow the lists.
- [ ] New endpoints covered by tests; lint/format clean; client build passes.

## Provides (outputs for later phases)

- Activity timeline UI + `lastRemindedAt` + reminder settings → **Phase 8** reframes the
  digest kindly (8f), and the timeline underpins effort metrics (8b).
- `isDue` digest query + search/filter → reused by "Now" mode (8a) and the capture inbox (8c).

## Notes / open questions

- The `Activity` model already exists; confirm whether a `reply` type needs a UI affordance
  or is only set via import.
- Decide if reminders should respect a quiet-hours / timezone per user (ties into 8f's
  time-aware nudges).
