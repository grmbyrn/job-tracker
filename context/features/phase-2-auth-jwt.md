# Phase 2 — Auth (JWT)

> Spec for roadmap Phase 2. See [roadmap.md](../roadmap.md) for the big picture.
> Specs chain via **Depends on** ← previous *Provides* and **Provides** → next *Depends on*.

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Status       | Completed (2026-06-29)                             |
| Branch       | `feature/auth`                                     |
| Roadmap ref  | Phase 2                                             |
| Depends on   | Phase 1 (`User` model, `passwordHash`, shared client) |
| Blocks       | Phase 3 (user-scoped CRUD), Phase 5 (frontend auth flow) |

## Goal

Let a user register, log in, and stay logged in via JWTs, with middleware that
authenticates requests and attaches `req.userId` — so every Phase 3 route can
scope its data to the current user.

## Depends on (inputs)

- `User` model with `email` (unique) + `passwordHash` (Phase 1).
- Shared `PrismaClient` at [server/src/db.js](../../server/src/db.js).
- `JWT_SECRET` / `JWT_REFRESH_SECRET` placeholders already in
  `server/.env.example` (Phase 0).
- Express 5 app in [server/src/index.js](../../server/src/index.js) with
  `cors` + `express.json()` already wired.

## Scope

- Install `bcrypt` (hashing) and `jsonwebtoken` (tokens); `cookie-parser` for
  the refresh cookie.
- Auth routes under `/api/auth`:
  - `POST /register` — validate, hash password, create `User`, return access
    token + set refresh cookie.
  - `POST /login` — verify email + password, return access token + set refresh cookie.
  - `POST /refresh` — read refresh cookie, verify, issue a new access token.
  - `POST /logout` — clear the refresh cookie.
- Auth middleware — verify the access token from the `Authorization: Bearer`
  header, attach `req.userId`, 401 on failure.
- One protected route to prove it end to end: `GET /api/me` → the current user
  (id, email, createdAt — never the hash).
- Lightweight input validation on the auth bodies (email shape, password length).
- Update the Phase 1 seed user to a **real bcrypt hash** with a known dev
  password so the seeded account can actually log in.

### Out of scope

- Centralized validation framework + error handler for all routes (Phase 3 —
  here, just inline guards on the two auth bodies).
- Any business-entity CRUD (Phase 3).
- Password reset / email verification / OAuth (not in roadmap scope).
- Frontend login UI and token storage in the client (Phase 5).
- Rate limiting / helmet hardening (Phase 8).

## Tasks

- [x] `npm i -w server bcrypt jsonwebtoken cookie-parser`.
- [x] Token helpers: `signAccessToken(userId)` (short TTL, e.g. 15m) and
      `signRefreshToken(userId)` (long TTL, e.g. 7d), each with its own secret.
- [x] `server/src/auth/` module: route handlers + middleware + token helpers
      (`tokens.js`, `middleware.js`, `routes.js`).
- [x] `register`: reject duplicate email (unique constraint / pre-check),
      `bcrypt.hash`, create user, respond `{ accessToken, user }` + refresh cookie.
- [x] `login`: look up by email, `bcrypt.compare`, same response shape; generic
      401 message on bad email *or* password (don't leak which).
- [x] `refresh`: verify refresh cookie → new access token (rotate refresh
      cookie optionally).
- [x] `requireAuth` middleware: parse Bearer token, `jwt.verify`, set
      `req.userId`; mount `GET /api/me` behind it.
- [x] Wire `cookie-parser` and CORS `credentials: true` (+ explicit origin) so
      the refresh cookie round-trips from the Vite client in Phase 5.
- [x] Add access/refresh TTLs (and the dev seed password) to `.env.example`.
- [x] Update `prisma/seed.js` to hash a known dev password for the seed user.

## Decisions to make here

- **Token storage (locked by roadmap):** refresh token in an **httpOnly cookie**
  (`SameSite=Lax`, `Secure` in prod), access token returned in the JSON body for
  the client to hold **in memory**. Don't put the access token in localStorage.
- **Password hashing:** `bcrypt` with cost factor 12 (roadmap names bcrypt;
  `argon2` is a stronger alt but stick with bcrypt for parity).
- **Refresh rotation:** start simple (re-issue access only). A rotating refresh
  token + reuse detection is a Phase 8 hardening item, not required here.
- **Validation tool:** inline guards now; defer `zod`/`express-validator` to
  Phase 3's centralized layer.

## Acceptance criteria

- [x] `POST /api/auth/register` creates a user with a bcrypt hash (never plain
      text) and returns an access token + sets the refresh cookie.
- [x] `POST /api/auth/login` with the seeded dev credentials returns an access token.
- [x] `GET /api/me` returns the user **only** with a valid Bearer token; `401`
      without one or with an expired/invalid token.
- [x] `POST /api/auth/refresh` issues a fresh access token from the refresh cookie.
- [x] Duplicate-email register and wrong-password login both fail with clear,
      non-leaky errors.
- [x] Lint + format clean; client `npm run build` still passes.

## Provides (outputs for later phases)

- `requireAuth` middleware + `req.userId` → **Phase 3** scopes every query by it.
- Working register/login/refresh/me + cookie/CORS setup → **Phase 5** builds the
  auth store, route guard, and 401 → refresh retry against these endpoints.
- A loginable seed user → manual API testing and frontend dev.

## Notes / open questions

- Confirm the access-token TTL (15m default) vs. how aggressively the client
  should refresh — revisit when wiring the Phase 5 axios interceptor.

### Implementation notes

- **Module layout:** `server/src/auth/` holds `tokens.js` (sign/verify helpers,
  reads `JWT_*` secrets + TTLs from env), `middleware.js` (`requireAuth` parses
  the Bearer token, sets `req.userId`, 401s on any failure), and `routes.js`
  (the `authRouter` mounted at `/api/auth`). `GET /api/me` lives in
  [server/src/index.js](../../server/src/index.js) behind `requireAuth`.
- **Token payload:** `{ sub: userId }`. Access TTL `JWT_ACCESS_TTL` (15m),
  refresh TTL `JWT_REFRESH_TTL` (7d); separate `JWT_SECRET` / `JWT_REFRESH_SECRET`.
- **Refresh cookie:** name `refreshToken`, `httpOnly`, `SameSite=Lax`,
  `Secure` only when `NODE_ENV=production`, `path=/api/auth` (so it isn't sent on
  every request), `maxAge` 7d. `logout` clears it with the same path.
- **CORS:** `origin: CLIENT_ORIGIN` (default `http://localhost:5173`) +
  `credentials: true` — wildcard origin can't be used with credentials.
- **Validation:** inline — email regex + min password length 8; register returns
  400 on bad input, 409 on duplicate email (Prisma `P2002`). Login returns a
  generic 401 for bad email *or* password, with a dummy `bcrypt.compare` on the
  unknown-email path to avoid a timing side-channel.
- **Seed:** seed user `dev@jobtracker.local` now gets a real bcrypt hash (cost 12)
  of `SEED_USER_PASSWORD` (default `devpassword123`); the seed prints the dev login.
- **Refresh rotation** deferred to Phase 8 as planned — `/refresh` re-issues the
  access token only and leaves the refresh cookie in place.
