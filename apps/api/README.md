# Waypad API

REST API for Waypad, built with **NestJS**, **Drizzle ORM** and **PostgreSQL**.

| Milestone | Status |
|---|---|
| 1. Foundation — config, schema, migrations, seed, health, CI | ✅ |
| 2. Accounts — register, login, refresh tokens, profile, forwarding address | ✅ |
| 3. Trips & reservations — CRUD, readiness, gaps, deadlines, dashboard | ✅ |
| 4. Booking import (PDF, email, AI extraction) | next |
| 5. City guide & suggestions | planned |
| 6. Deployment | planned |

See [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md#roadmap) for the full plan.

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

Demo login after seeding: `esra@demo.waypad.app` / `waypad-demo1`.

## Endpoints

All routes are under `/api/v1`. Everything needs `Authorization: Bearer <accessToken>` unless marked public.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | public — database check |
| POST | `/auth/register` | public — `{ email, password, fullName, language? }` → user + tokens |
| POST | `/auth/login` | public — `{ email, password }` → user + tokens (5 tries/min) |
| POST | `/auth/refresh` | public — `{ refreshToken }` → new access token + new refresh token |
| POST | `/auth/logout` | public — `{ refreshToken }` → 204 |
| GET | `/me` | profile, language, budget level, forwarding address |
| PATCH | `/me` | `{ fullName?, language?, budgetLevel?, homeCity? }` |
| GET | `/me/forward-address` | `{ forwardAddress: "esra@in.waypad.app" }` |
| GET | `/dashboard?today=` | next trip, upcoming trips, stats, gaps, deadlines, recently added, needs review |
| GET | `/trips?when=upcoming\|past\|all&today=` | each trip with nights, readiness, booking count, total |
| POST | `/trips` | `{ city, countryCode, startDate, endDate, travelers? }` (+ `country, lat, lon` for a new city) |
| GET | `/trips/:id` | trip + readiness, gaps, deadlines, day-by-day timeline, reservations |
| PATCH / DELETE | `/trips/:id` | edit (owner/editor) / soft delete (owner) — its bookings go to Unsorted |
| GET | `/reservations?tripId=\|unsorted=true\|status=pending` | |
| POST | `/reservations` | manual booking; without `tripId` it joins the trip whose dates contain it |
| GET / PATCH / DELETE | `/reservations/:id` | `tripId: null` moves it to Unsorted |
| POST | `/reservations/:id/confirm` | "Looks right" after an import — clears the "Please check" flags |
| POST | `/reservations/:id/cancel` | |

`today` is optional everywhere: it defaults to the real date. The web demo sends `2026-10-30`, the day its story is set.

Dates: trip days are `YYYY-MM-DD`; booking times are **local times at the destination** without a zone, `YYYY-MM-DDTHH:mm`, exactly as printed on the ticket. Prices are integer cents plus a currency code.

Errors always have the same shape:

```json
{ "code": "EMAIL_TAKEN", "message": "An account with this email already exists — try signing in", "details": null }
```

For validation errors `code` is `BAD_REQUEST`, `message` is `Validation failed` and `details` lists the problems.

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
  common/            error filter (one error shape for every response)
  auth/              register, login, refresh, logout; JWT guard; @Public() and @CurrentUser()
  users/             UsersService, GET/PATCH /me, forwarding address
  trips/             trips CRUD; planning.ts = readiness, gaps, deadlines, timeline (pure, unit-tested)
  reservations/      reservations CRUD, confirm/cancel, GET /dashboard
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
- **Short access tokens + rotating refresh tokens.** Access tokens are JWTs valid for 15 minutes. Refresh tokens are random strings; only their SHA-256 hash is stored. Each refresh replaces the token. If an old token is used again (a sign it was stolen), every token in that login "family" is revoked and the user must sign in again.
- **Passwords with Argon2id** (`@node-rs/argon2`, prebuilt, no compiler needed). A failed login for an unknown email still runs a hash check, so the response time does not reveal which emails have accounts, and the error message is the same.
- **Secure by default.** A global guard requires a valid access token on every route; public routes opt out with `@Public()`. Rate limiting is global (100/min) and stricter on login and register.
- **Forwarding alias from the name.** "Esra Demirtürk" gets `esra@in.waypad.app`; if that is taken, `esra2`, `esra3` …
- **Planning rules are pure functions** (`src/trips/planning.ts`): no database, easy to unit-test, the same rules as the web demo. Services only load rows and call them.
- **Access through membership.** Every trip query joins `trip_members`, so sharing (editor/viewer) works without changes. Someone else's trip or booking answers **404**, never 403, so ids cannot be probed.
- **Deleting a trip keeps the bookings**: they move to Unsorted instead of being lost.
- **Tests use a real database.** e2e tests migrate and seed a separate `waypad_test` database, the same way CI does.

## Environment variables

| Name | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — (required) | `postgresql://user:pass@host:5432/db` |
| `PORT` | `3000` | |
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `CORS_ORIGINS` | `http://localhost:5173,https://esrademirturk-nl.github.io` | Comma-separated browser origins |
| `JWT_SECRET` | — (required) | At least 32 characters. Generate one with `openssl rand -base64 48` |
| `JWT_ACCESS_TTL` | `900` | Access token lifetime in seconds |
| `REFRESH_TTL_DAYS` | `30` | Refresh token lifetime in days |
| `FORWARD_DOMAIN` | `in.waypad.app` | Domain of the personal forwarding addresses |
| `TEST_DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/waypad_test` | Used by the e2e tests |
