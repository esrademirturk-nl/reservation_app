# Architecture

## Current state

A front-end-only React app with demo data, published on GitHub Pages. No backend, no login, no external API calls except photos from Wikimedia Commons and Google Fonts.

## Stack

| Concern | Choice |
|---|---|
| UI | React 19, TypeScript (strict) |
| Build | Vite |
| Styling | Tailwind CSS v4 with CSS-variable design tokens |
| Routing | React Router 7 (`BrowserRouter`, base path from Vite) |
| Icons | lucide-react |
| QR codes | qrcode.react (real, scannable SVG codes) |
| Audio guide | Web Speech API (`speechSynthesis`) |
| Hosting | GitHub Pages via GitHub Actions |

## Folder structure (`apps/web/src`)

```
App.tsx                 Routes
main.tsx                Entry point
index.css               Tailwind import, light/dark tokens, theme mapping
components/
  AppShell.tsx          Sidebar / top bar / bottom tab bar, theme toggle, account menu
  MiniPlayer.tsx        Audio guide player that follows you across pages
  TripsMap.tsx          Illustrated Europe map with trip pins and routes
  europe-land.ts        Land outline extracted from the design
  ui.tsx                Card, Photo (with fallback), ReadinessBar, type icons
data/                   Demo data and types (see DATA-MODEL.md)
lib/
  trips.ts              All computed values and date formatting
  audio.tsx             Audio guide state (React context) and speech playback
pages/
  Dashboard.tsx, MyTrips.tsx, Wallet.tsx, Suggestions.tsx, PlaceDetail.tsx
  trip/
    TripDetail.tsx      Header + tabs
    Overview.tsx, DayPlan.tsx, Bookings.tsx, Documents.tsx
    TravelBook.tsx, BookPages.tsx, OrderBook.tsx
```

## Design tokens and theming

- Colours come from the exported `Waypad-Color.Light/Dark.tokens.json` and live as CSS variables in `index.css` (`--c-primary`, `--c-highlight`, …).
- Tailwind maps them to utility names: `bg-primary`, `text-ink`, `text-muted`, `bg-highlight`, `bg-highlight-soft`, `bg-tint`, `border-line`, `bg-hero`.
- Dark mode = the `dark` class on `<html>`; the toggle remembers the choice in `localStorage` (wrapped in `try/catch`).
- Brand palette: Egyptian Blue `#043263`, Peacock Blue `#01AFD1`, Dodger Blue `#239EFE`, Malibu Blue `#7DBAFB`, Blue Daze `#DBE5FF`, accent Damask Orange `#D5603F`.
- Fonts: Manrope (UI), Cormorant Garamond (travel book serif).

## Notable implementation details

- **URL state:** tabs, selected day, open drawer and ticket live in the URL (`?tab=`, `?day=`, `?open=`, `?ticket=`, `?nearby=1`), so every state can be linked to and the browser back button works.
- **Trips map:** the land outline comes from the dashboard design. A linear projection fitted to the design's Amsterdam, Prague and Rome positions places any city; the view frames all trips automatically.
- **Audio guide:** narration is split into sentences and spoken one by one, so the transcript can highlight the current sentence and seek by sentence. A simulated clock drives the progress bar. The state lives in a context above the router, so the mini player keeps playing across pages.
- **Demo store (`lib/store.ts`):** imported bookings are added to the shared bookings list, so readiness, gaps and totals update everywhere at once; the demo moment changes "today" or hides trips. Imported bookings are kept in `sessionStorage` for the session.
- **Photos:** `Photo` shows a warm gradient until the image loads or if it fails.
- **Travel book:** pages are built with HTML/CSS and sized in `em`, so the same component renders the large preview and the small thumbnails.

## Responsive layout

Tailwind breakpoints: `sm` 640 px, `md` 768 px, `lg` 1024 px. Below `lg` the sidebar becomes a top bar plus a bottom tab bar and two-column layouts stack. Details in [SCREENS.md](SCREENS.md#responsive-rules).

## API (`apps/api`)

NestJS 11 + Drizzle ORM + PostgreSQL 16, with Redis (BullMQ) for background jobs. All routes are under `/api/v1`; the full endpoint list, design decisions and environment variables are in [apps/api/README.md](../apps/api/README.md).

| Module | What it does |
|---|---|
| `auth`, `users` | Register, login, rotating refresh tokens (reuse detection), profile, personal forwarding address |
| `trips` | Trips through membership (owner / editor / viewer), readiness, gaps, deadlines, day-by-day timeline, the user's planned stops |
| `reservations` | Bookings: manual add with automatic trip matching, Unsorted, review (confirm), cancel; `GET /dashboard` |
| `imports` | Upload or forward a booking → storage → queue → text (PDF/HTML/.eml) → reader (Claude, or offline rules) → pending reservations with "Please check" flags |
| `guide` | Near me, place detail with audio guide per language (AI translation cached), suggestions (fix gaps, fill free time, don't miss) |
| `health` | `GET /health` for containers and uptime checks |

```
          ┌──────────── API container (NestJS) ────────────┐
web/app ─►│ REST /api/v1 ─► services ─► Drizzle ─► PostgreSQL │
          │        │                                       │
mail  ───►│ webhook└─► BullMQ queue ◄─► worker ─► Claude API │
          │                 │ Redis        │               │
          │                 ▼              ▼               │
          │            storage (disk / Azure Blob)          │
          └────────────────────────────────────────────────┘
```

Product rules that both apps need (readiness, gaps, deadlines, free time) are pure functions (`src/trips/planning.ts`, `src/guide/suggest.ts`) with unit tests, mirroring `apps/web/src/lib/trips.ts`.

**ORM change:** the Technical Design Document (v2.0) planned Prisma. The API uses **Drizzle ORM** instead: schema in TypeScript, migrations as reviewable SQL files, and no engine binary to download, which keeps builds reproducible in restricted environments. See [apps/api/README.md](../apps/api/README.md) for decisions and scripts.

## Deployment

**API:** a Docker image (`apps/api/Dockerfile`) is built and smoke-tested on every pull request and published to GitHub Container Registry from `main` (`.github/workflows/api-image.yml`). The step-by-step Azure guide is in [DEPLOYMENT.md](DEPLOYMENT.md).

**Web:** `.github/workflows/deploy-web.yml` runs on every push to `main` that changes `apps/web/`:

1. `npm ci` and `npm run build` with `GITHUB_PAGES=true`, which sets the Vite `base` and router `basename` to `/reservation_app/`.
2. Copies `index.html` to `404.html`, so deep links like `/trips/rome/plan` open the app.
3. Uploads `dist/` and deploys it to GitHub Pages.

Locally `npm run dev` serves the app at `/`.

## Roadmap

1. ✅ **Designed screens:** empty dashboard, after-trip dashboard, import flow (Import → Review → Saved). Still open: bulk import page for several files; dark-mode polish.
2. ✅ **Backend (NestJS + Drizzle):** accounts, trips and reservations, readiness/gaps/deadlines, booking import (upload, forwarded email, AI or rule-based reading, queue), city guide, day plan and suggestions, Docker image.
3. **Connect the web app to the API:** login screen, replace the demo store with API calls (keep the demo mode for the portfolio link), import review screen on `/imports/:id`.
4. **More AI:** suggestions from reviews within the user's budget, audio narration generated for new places, photo-to-day matching for the travel book.
5. **Mobile app (React Native):** Wallet offline, location-triggered Nearby and audio guide, push notifications for deadlines.
6. **Security review, user testing, store submission.**
