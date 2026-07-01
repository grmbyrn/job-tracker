# Phase 5 — Vue frontend foundation

> Spec for roadmap Phase 5. See [roadmap.md](../roadmap.md) for the big picture.
> Specs chain via **Depends on** ← previous *Provides* and **Provides** → next *Depends on*.

| Field       | Value                                                              |
| ----------- | ----------------------------------------------------------------- |
| Status      | Completed (2026-07-01) — shipped to `main` (`ace2d6d`); live verify pending |
| Branch      | `feature/frontend-foundation`                                     |
| Roadmap ref | Phase 5                                                           |
| Depends on  | Phase 2 (auth endpoints + token model), Phases 3–4 (REST API)     |
| Blocks      | Phase 6 (feature-parity views build on this shell)               |

## Goal

Stand up the Vue app shell — routing, state, an authenticated API layer, and the
login/register flow — so the frontend has a real foundation to build the
prototype's views on. End state: a user can log in and land on an empty
authenticated app shell with working navigation, with unauthenticated users bounced
to `/login`.

## Depends on (inputs)

- Auth endpoints `/api/auth/register|login|refresh|logout` + `GET /api/me` (Phase 2).
- Token model (Phase 2): access token returned in the JSON body (client holds it in
  memory), refresh token in an `httpOnly`, `SameSite=Lax`, `path=/api/auth` cookie.
- CORS is already `credentials: true` with an explicit `CLIENT_ORIGIN` (Phase 2), so
  the Vite dev origin can send the refresh cookie.
- REST API for companies/contacts/activities/applications (Phase 3) and
  `POST /api/import` (Phase 4) — the stores will call these in Phase 6.
- The Vite Vue client scaffold + prototype `index.html` (CSS tokens, light/dark).

## Scope

- **Dependencies:** `vue-router`, `pinia`, and an HTTP client (`axios` or a thin
  `fetch` wrapper) added to the `client` workspace.
- **API client:** a single module that
  - injects the in-memory access token as `Authorization: Bearer …`,
  - sends credentials so the refresh cookie rides along,
  - on a `401`, calls `POST /api/auth/refresh` once, then retries the original
    request; a failed refresh clears auth state and redirects to `/login`.
- **Router:** routes `/login`, `/register`, `/` (outreach), `/applications`,
  `/companies`; a global guard redirects unauthenticated users to `/login` and keeps
  authed users out of `/login`/`/register`.
- **Stores (Pinia):** `auth` (access token in memory, current user, login/logout/
  refresh actions, bootstrap via `GET /api/me`), plus placeholder `contacts`,
  `applications`, `companies` stores (state + fetch actions; full wiring is Phase 6).
- **Styling:** port the prototype's CSS design tokens and light/dark theme into the
  Vue app — a global stylesheet and/or a `useTheme` composable.
- **Shell:** an app layout with nav across the main views; views can be empty
  placeholders (populated in Phase 6).

### Out of scope

- The actual view logic — lane tabs, pipeline groups, forms, countdown pills, status
  transitions, export/import buttons (all **Phase 6**).
- Real reminders, search, activity timeline UI (**Phase 7**).
- Refresh-token rotation on the server (**Phase 8**).

## Tasks

- [x] Install `vue-router`, `pinia`, `axios` in `client`.
- [x] API client module (`src/api/client.js`) with auth-header injection +
      single-flight 401 → refresh-retry.
- [x] `auth` Pinia store (in-memory access token, `bootstrap` via refresh + `GET /me`,
      login/register/logout/refresh).
- [x] Placeholder `contacts` / `applications` / `companies` stores (shared
      `defineCollectionStore` factory).
- [x] Router with the five routes + global auth guard (cold-load silent refresh
      before deciding redirects).
- [x] App shell layout + nav (`App.vue`); empty view placeholders per route.
- [x] Port prototype CSS tokens + light/dark theme (`style.css` + `useTheme`
      composable with auto/light/dark).
- [x] lint/format clean; client `npm run build` passes.
- [ ] Live verify: login → authed shell with working nav; guard redirects
      (needs server + Postgres up).

## Decisions to make here

- **Access token in memory, not `localStorage`:** matches the Phase 2 design (XSS
  can't read it); it's rehydrated on reload via the refresh cookie + `GET /api/me`.
- **`axios` vs `fetch` wrapper:** either is fine; pick one and centralize it so the
  401-refresh-retry logic lives in exactly one place.
- **Where the guard reads auth:** the `auth` store is the single source of truth;
  the router guard checks it (and triggers a silent refresh on cold load before
  deciding to redirect).
- **Theme mechanism:** global stylesheet for tokens; a `useTheme` composable only if
  light/dark needs to be toggled at runtime like the prototype.

## Acceptance criteria

- [x] `vue-router` + `pinia` wired; the app boots with the five routes.
- [x] Prototype design tokens (light/dark) are ported into the Vue app.
- [x] The route guard redirects unauthenticated users to `/login`.
- [x] The API client injects the access token and retries once via
      `/api/auth/refresh` on a `401`.
- [x] Lint/format clean; client `npm run build` passes.
- [ ] Logging in lands on an empty authenticated app shell with working nav
      _(pending a live run with the server + Postgres up)_.

### Implementation notes

- **Access token in memory only.** `src/api/client.js` holds it in a module var
  (not `localStorage`); the `auth` store mirrors it and re-registers it via
  `setAccessToken`. On a 401 a **single-flight** `refreshAccessToken()` hits
  `/api/auth/refresh` with `withCredentials` (a bare `axios` call to dodge
  interceptor recursion), updates the token, and replays the original request;
  auth routes are excluded from retry so a bad login stays a 401.
- **Cold-load rehydrate.** The router guard calls `auth.bootstrap()` once
  (`ready` flag) — it attempts a silent refresh + `GET /me` before deciding
  whether to redirect, so a reload doesn't bounce a logged-in user to `/login`.
- **Theme.** `style.css` keeps the prototype's `prefers-color-scheme` default and
  adds an explicit `[data-theme]` override driven by `useTheme` (auto → light →
  dark), toggled from the header.
- **Stores.** `contacts`/`applications`/`companies` share a
  `defineCollectionStore(id, path)` factory (state + `fetchAll`); Phase 6 adds
  the mutating actions.

## Provides (outputs for later phases)

- App shell, router, `auth` store, and an authenticated API client → **Phase 6**
  fills the outreach/applications/companies views against the live API and wires the
  export/import buttons to Phase 4's endpoint.

## Notes / open questions

- Confirm the Vite dev origin matches the server's `CLIENT_ORIGIN` so the refresh
  cookie is accepted in dev.
- Decide whether cold-load bootstrap always attempts a silent refresh, or only when
  an access token is absent.
