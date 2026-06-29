# Job Tracker

Full-stack job-application & outreach tracker — migrating the single-file
`index.html` prototype into a Vue + Node/Express + Postgres app.

See [context/roadmap.md](context/roadmap.md) for the phased plan and
[context/current-feature.md](context/current-feature.md) for the active feature.

## Stack

| Layer    | Choice                                   |
| -------- | ---------------------------------------- |
| Frontend | Vue 3 (Composition API) + Vite           |
| Backend  | Node + Express (REST API)                |
| Database | PostgreSQL (via Docker Compose)          |

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

## Useful scripts (run from repo root)

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Run client and server concurrently       |
| `npm run dev:client`   | Run only the Vue dev server              |
| `npm run dev:server`   | Run only the Express server              |
| `npm run build`        | Build the client for production          |
| `npm run db:up`        | Start the Postgres container             |
| `npm run db:down`      | Stop the Postgres container              |
| `npm run lint`         | Lint client + server                     |
| `npm run format`       | Format the repo with Prettier            |
