# Waypad API

REST API for Waypad, built with **NestJS**, **Drizzle ORM** and **PostgreSQL**.

Milestone 1 (this version) is the foundation: configuration, database schema and migrations, demo seed data, a health check, tests and CI. Accounts, trips and booking import follow in the next milestones (see [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md#roadmap)).

## Run it locally

Requirements: Node.js 22, Docker (or your own PostgreSQL 16).

```bash
# from the repository root: start PostgreSQL (+ Redis for later milestones)
docker compose up -d

cd apps/api
cp .env.example .env
npm install
npm run db:migrate     # create the tables
npm run db:seed        # load the demo story (Esra, Rome 12–16 Nov 2026, …)
npm run start:dev      # http://localhost:3000/api/v1/health
```

## Scripts

| Script | What it does |
|---|---|
| `npm run start:dev` | Start with hot reload |
| `npm run db:generate` | Create a new SQL migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations from `drizzle/` |
| `npm run db:seed` | Reset and load the demo data (safe to run again) |
| `npm run db:studio` | Browse the database in Drizzle Studio |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests against the `waypad_test` database |
| `npm run lint` / `npm run typecheck` | Code checks (also run in CI) |

## Structure

```
src/
  main.ts            start-up
  setup-app.ts       global prefix /api/v1, validation, CORS, shutdown hooks (shared with tests)
  app.module.ts      root module
  config/env.ts      environment variables, validated with zod at start-up
  db/
    schema.ts        all tables, enums and relations
    db.module.ts     global Drizzle + pg Pool provider (token: DB)
    migrate.ts       applies migrations
    seed/            demo data and seed script
  health/            GET /api/v1/health (checks the database)
drizzle/             generated SQL migrations (committed)
test/                end-to-end tests
```

## Design decisions

- **Drizzle instead of Prisma.** The schema is plain TypeScript and migrations are plain SQL files that can be reviewed in a pull request. No binary engine is downloaded at install time, so the project builds and tests in any environment, including restricted CI.
- **Modular monolith.** One Nest module per feature (health now; auth, trips, reservations, ingestion next). The database is injected through a `DB` token, so services stay testable.
- **Computed values are not stored.** Readiness, gaps, deadlines and totals are calculated from reservations (same rules as the web app), so they can never get out of sync.
- **Local times for bookings.** `start_at` and `end_at` are stored without time zone, exactly as printed on the ticket in the destination's local time.
- **Soft delete** (`deleted_at`) on user-owned tables; deleting a user cascades to all their data (GDPR).
- **Fail fast on bad config.** The app does not start if an environment variable is missing or invalid, and says which one.
- **Tests use a real database.** e2e tests migrate and seed a separate `waypad_test` database, the same way CI does.

## Environment variables

| Name | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — (required) | `postgresql://user:pass@host:5432/db` |
| `PORT` | `3000` | |
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `CORS_ORIGINS` | `http://localhost:5173,https://esrademirturk-nl.github.io` | Comma-separated browser origins |
| `TEST_DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/waypad_test` | Used by the e2e tests |
