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
- **Photos:** `Photo` shows a warm gradient until the image loads or if it fails.
- **Travel book:** pages are built with HTML/CSS and sized in `em`, so the same component renders the large preview and the small thumbnails.

## Responsive layout

Tailwind breakpoints: `sm` 640 px, `md` 768 px, `lg` 1024 px. Below `lg` the sidebar becomes a top bar plus a bottom tab bar and two-column layouts stack. Details in [SCREENS.md](SCREENS.md#responsive-rules).

## API (`apps/api`)

Milestone 1 is in place: NestJS app with the `/api/v1` prefix, environment validation (zod), Drizzle ORM schema for users, cities, trips, trip members, inbound emails, source documents, reservations, day plans and plan items, SQL migrations in `apps/api/drizzle`, a demo seed that mirrors the web app's data, `GET /api/v1/health`, unit and end-to-end tests against PostgreSQL, and a CI workflow (`.github/workflows/api.yml`).

**ORM change:** the Technical Design Document (v2.0) planned Prisma. The API uses **Drizzle ORM** instead: schema in TypeScript, migrations as reviewable SQL files, and no engine binary to download, which keeps builds reproducible in restricted environments. See [apps/api/README.md](../apps/api/README.md) for decisions and scripts.

## Deployment

`.github/workflows/deploy-web.yml` runs on every push to `main` that changes `apps/web/`:

1. `npm ci` and `npm run build` with `GITHUB_PAGES=true`, which sets the Vite `base` and router `basename` to `/reservation_app/`.
2. Copies `index.html` to `404.html`, so deep links like `/trips/rome/plan` open the app.
3. Uploads `dist/` and deploys it to GitHub Pages.

Locally `npm run dev` serves the app at `/`.

## Roadmap

1. **Remaining designed screens:** empty dashboard, after-trip "Welcome back" dashboard, import flow (Import → Review → Saved), dark-mode polish.
2. **Backend (NestJS + Prisma, TypeScript):** entities from [DATA-MODEL.md](DATA-MODEL.md#moving-to-a-backend), auth, booking import from forwarded emails and PDFs (parsing with field confidence for "Please check"), computed gaps, readiness and deadlines.
3. **AI services:** suggestions from reviews within the user's budget (max 3 at a time), audio narration in the user's language, photo-to-day matching for the travel book.
4. **Mobile app (React Native):** Wallet offline, location-triggered Nearby and audio guide, push notifications for deadlines.
5. **Security review, user testing, store submission.**
