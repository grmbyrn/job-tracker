# Job Tracker

Full-stack job-application & outreach tracker — migrating the single-file
`index.html` prototype into a Vue + Node/Express + Postgres app.

**Live:** [job-tracker-client-rho.vercel.app](https://job-tracker-client-rho.vercel.app)
· API: [job-tracker-production-59e6.up.railway.app](https://job-tracker-production-59e6.up.railway.app/api/health)

See [context/roadmap.md](context/roadmap.md) for the phased plan and
[context/current-feature.md](context/current-feature.md) for the active feature.

## Stack

| Layer    | Choice                                              |
| -------- | --------------------------------------------------- |
| Frontend | Vue 3 (Composition API) + Vite + Vue Router + Pinia |
| Backend  | Node + Express (REST API)                           |
| ORM      | Prisma 7 (driver-adapter, node-postgres)            |
| Database | PostgreSQL (Docker Compose locally)                 |
| Auth     | JWT — access token in memory, refresh in httpOnly cookie |
| Tests    | Vitest + Supertest (API) · Vitest + @vue/test-utils (client) |

## Architecture

```
Browser ──HTTPS──▶  Vue SPA (Vercel, static)
                        │  axios, VITE_API_URL, withCredentials
                        ▼
                    Express REST API (Railway)
                        │  Prisma (driver adapter)
                        ▼
                    PostgreSQL (Railway managed)
```

- The SPA holds the **access token in memory** and sends it as `Authorization: Bearer`.
  The **refresh token** lives in an httpOnly cookie scoped to `/api/auth`; a `401`
  triggers a single-flight refresh + retry.
- Every API route is behind `requireAuth` and scoped to `req.userId`.
- Security middleware: `helmet`, `express-rate-limit` on auth, and an env-driven CORS
  allowlist (`CLIENT_ORIGIN`).

## Project layout

```
client/   Vue 3 + Vite app          (dev server :5173)
server/   Express API               (dev server :3000)
context/  Roadmap & feature specs
index.html  Original prototype (kept for reference / Phase 4 migration)
```

## Prerequisites

- Node.js 20+
- Docker (for local Postgres)

## Getting started

```bash
# 1. Install dependencies (npm workspaces — installs client + server + root)
npm install

# 2. Copy env files and adjust as needed
cp server/.env.example server/.env
cp client/.env.example client/.env

# 3. Start Postgres
npm run db:up

# 4. Run client + server together
npm run dev
```

- Client: http://localhost:5173
- API health check: http://localhost:3000/api/health → `{ "ok": true }`

## Testing

```bash
npm run db:up      # tests run against the local Postgres, in an isolated `test` schema
npm test           # server integration tests + client unit/component tests
```

- `npm run test:server` — API integration tests (Vitest + Supertest). Auto-migrates an
  isolated `test` schema in the dev database and truncates between tests, so your dev
  data is never touched.
- `npm run test:client` — client tests (Vitest + @vue/test-utils, jsdom).

## Useful scripts (run from repo root)

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Run client and server concurrently       |
| `npm run dev:client`   | Run only the Vue dev server              |
| `npm run dev:server`   | Run only the Express server              |
| `npm run build`        | Build the client for production          |
| `npm test`             | Run all tests (server + client)          |
| `npm run db:up`        | Start the Postgres container             |
| `npm run db:down`      | Stop the Postgres container              |
| `npm run db:migrate`   | Create/apply a dev migration             |
| `npm run db:deploy`    | Apply migrations (production)            |
| `npm run lint`         | Lint client + server                     |
| `npm run format`       | Format the repo with Prettier            |

## Deployment

Deployed as two services: the **API + Postgres on Railway** and the **frontend on Vercel**.

### API + database (Railway)

1. Create a Railway project; add a **PostgreSQL** plugin (provides `DATABASE_URL`).
2. Add the API service from this repo. [`railway.json`](railway.json) sets it up:
   - **preDeploy** runs `npm run db:deploy` (applies migrations on each release),
   - **start** runs `npm start --workspace server`,
   - health check hits `/api/health`.
3. Set env vars on the API service:

   | Var                  | Value                                             |
   | -------------------- | ------------------------------------------------- |
   | `DATABASE_URL`       | from the Postgres plugin                           |
   | `JWT_SECRET`         | a long random string                              |
   | `JWT_REFRESH_SECRET` | a different long random string                    |
   | `CLIENT_ORIGIN`      | your Vercel URL(s), comma-separated               |
   | `NODE_ENV`           | `production` (enables the `Secure` refresh cookie) |

### Frontend (Vercel)

1. Import the repo; set **Root Directory** to `client` (framework preset: Vite).
2. Env var: `VITE_API_URL` = `https://<your-railway-api>/api`.
3. [`client/vercel.json`](client/vercel.json) provides the SPA fallback so client-side
   routes don't 404 on refresh.

### Cross-origin auth note

The frontend and API are on different domains, so the refresh cookie is sent cross-site.
Setting `NODE_ENV=production` on the API makes the cookie `SameSite=None; Secure`
(handled in `server/src/auth/routes.js`), which browsers require for cross-site cookies
over HTTPS. Make sure `CLIENT_ORIGIN` exactly matches your Vercel origin, or the browser
will refuse to attach the cookie.

### Smoke test

After both are live: register a new account on the Vercel URL, then run the full
outreach → applications → companies flow to confirm it works end to end in production.
