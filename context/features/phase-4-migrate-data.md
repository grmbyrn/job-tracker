# Phase 4 — Migrate existing data

> Spec for roadmap Phase 4. See [roadmap.md](../roadmap.md) for the big picture.
> Specs chain via **Depends on** ← previous *Provides* and **Provides** → next *Depends on*.

| Field       | Value                                                             |
| ----------- | ---------------------------------------------------------------- |
| Status      | Implemented (2026-07-01) — pending PR                            |
| Branch      | `feature/data-import`                                            |
| Roadmap ref | Phase 4                                                          |
| Depends on  | Phase 3 (models + validation/HTTP infra), Phase 2 (`requireAuth`) |
| Blocks      | Phase 6 (import button in the UI reuses this endpoint)          |

## Goal

Don't lose what's in the prototype's `localStorage`. Restore the prototype's
"Export backup" JSON into Postgres through a user-scoped `POST /api/import`, so an
exported backup file is fully reproduced (contacts, applications, companies,
activity notes) under the requesting user.

## Depends on (inputs)

- Prisma models `Company`, `Contact`, `Activity`, `Application` (Phase 1).
- `requireAuth` → `req.userId` (Phase 2).
- `validate(schema)` middleware + `asyncHandler`/`ApiError`/`errorHandler` (Phase 3).
- The prototype's backup shape in the root `index.html`
  (`{ items, apps, targets, timers }`; contact statuses incl. legacy `reply`).

## Scope

- **Endpoint:** `POST /api/import?mode=merge|replace` behind `requireAuth`, scoped
  by `req.userId`. Body is the prototype's verbatim export
  ([server/src/routes/import.js](../../server/src/routes/import.js)).
- **Validation:** a lenient `importSchema`
  ([server/src/validation/schemas.js](../../server/src/validation/schemas.js)) —
  strips the prototype's client-side `id`s, normalizes statuses, and defaults
  missing/empty values instead of rejecting a real backup file.
- **Mapping:**
  - `targets[]` → `Company` (`name`, `link`, `contacted`).
  - `items[]` → `Contact`: `status` → `stage` (legacy `reply` → `accepted`);
    `firstDate`/`lastDate`/`followups` carried over; the free-text `note` becomes
    the contact's first `Activity` (`type: "note"`) since `Contact` has no note field.
  - `apps[]` → `Application` (`company`, `position`, `link`, `note`, `appliedDate`,
    `status`; a missing `appliedDate` defaults to now).
  - Contacts link to a company when their `name` matches a target's `name`
    (trim + case-insensitive).
  - `timers` → echoed back un-persisted (no Settings model yet — Phase 6).
- **Transaction:** the whole import runs in one `prisma.$transaction`, so a
  validation/DB error leaves no partial import.
- **Postman:** an "Import" folder exercising the route.

### Out of scope

- Persisting `timers` (needs the Phase 6 Settings model).
- A standalone CLI import script — a single authenticated endpoint covers the
  "restore your prototype data" use case and is reused by the Phase 6 UI.
- Any frontend (Phase 5/6).

## Tasks

- [x] `importSchema` (+ `optionalDate` helper) in `validation/schemas.js`.
- [x] `importRouter` — mapping, name-based company linking, note → Activity, in a
      transaction; `mode=merge|replace`.
- [x] Mount `/api/import` behind `requireAuth` in `server/src/index.js`.
- [x] Postman "Import" folder + collection description update.
- [x] Verify a backup imports; counts + stages match; lint/format + client build clean.

## Decisions to make here

- **Endpoint over one-off script:** an authenticated `POST /api/import` (not a
  CLI script) so it's user-scoped for free and the Phase 6 "Import backup" button
  can reuse it directly.
- **`merge` vs `replace`:** default `merge` (append) is non-destructive; `?mode=replace`
  wipes the user's companies/contacts/applications first for a true restore. The
  prototype's own import replaced everything, so `replace` matches that behavior.
- **`note` → Activity:** consistent with the Phase 3 decision to drop the contact
  `note` column in favor of the activity timeline.
- **`timers` echoed, not stored:** no Settings model exists yet; dropping them
  silently would be surprising, so the response returns them under `timersIgnored`.

## Acceptance criteria

- [x] A prototype backup file imports cleanly; `imported` counts and contact
      `stage`s match the source (with `reply` → `accepted`).
- [x] Route is behind `requireAuth` + scoped by `req.userId`; `mode=replace` is a
      clean restore, `mode=merge` appends.
- [x] Contacts whose `name` matches a target link to that company (derived
      `contactedCount` reflects them).
- [x] Postman "Import" request succeeds; lint/format clean; client `npm run build` passes.

### Implementation notes

- **One endpoint, `validate(importSchema)` + a transaction.** Companies are
  created first to build a `nameKey → id` map; contacts resolve `companyId` from
  it and their `note` becomes a `type: "note"` Activity; applications use
  `createMany`. Transaction `timeout` bumped to 30s since rows are created one by
  one (needed to capture company ids).
- **Lenient schema:** unknown keys (prototype `id`s) are stripped by zod's default
  object behavior; `optionalDate` maps `''`/`null`/missing → `null`; `followups`/
  `contacted` fall back to `0` via `.catch(0)`; a missing `appliedDate` → now.
- **Verified via curl** (server + Dockerized Postgres): a mixed backup imported as
  `{companies:1, contacts:3, activities:1, applications:1}`; `reply`→`accepted`,
  `sent`/`hit` preserved, name-linking set `contactedCount`; `mode=replace` is
  idempotent, `mode=merge` appends; bad `lane` → 400 field issue; no token → 401.

## Provides (outputs for later phases)

- A working restore path → **Phase 6** wires the "Import backup" button to this
  endpoint, keeping the JSON backup capability from the prototype.

## Notes / open questions

- Per-user timer settings (`timers`) are echoed but not persisted; revisit when
  the Phase 6 Settings model lands.
