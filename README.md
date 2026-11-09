# Waypad

**All your travel bookings in one place.** Waypad collects flights, hotels, trains and tickets from different sources (Booking.com, airline emails, PDFs), groups them into trips, spots what is missing, plans each day and keeps every ticket ready offline. After the trip it turns your photos into a printed travel book.

**Live demo:** https://esrademirturk-nl.github.io/reservation_app/

> Portfolio project. The web app currently runs on demo data (a Rome trip on 12–16 Nov 2026, seen from "today" = 30 Oct 2026). The backend (NestJS) and mobile app (React Native) are next on the roadmap.

## What it does

| | |
|---|---|
| **Collect** | Forward confirmation emails to a personal address or drop a PDF; bookings are read and grouped into trips. |
| **Protect** | Readiness score per trip, alerts for nights without a stay, free-cancellation deadlines and check-in dates. |
| **Plan** | Day-by-day plan built from your bookings, free-time blocks with suggestions, and a "Near me" panel. |
| **Travel** | Wallet with ticket-style passes, boarding pass after check-in, full-screen QR for scanning. |
| **Explore** | Place pages with an AI-narrated audio guide (English, Türkçe, Nederlands) that keeps playing while you browse. |
| **Remember** | Travel book editor with three themes and an order flow for a printed copy. |

## Repository

```
reservation_app/
├── apps/
│   └── web/                 React web app (this is what the live demo runs)
├── docs/
│   ├── PRODUCT.md           Product overview, features and user journey
│   ├── SCREENS.md           Every screen, its route, design frame and states
│   ├── DATA-MODEL.md        Types, computed rules and demo data decisions
│   ├── ARCHITECTURE.md      Stack, folder structure, theming, audio, deployment
│   └── DEMO-SCRIPT.md       5–7 minute walkthrough for presenting the demo
└── .github/workflows/
    └── deploy-web.yml       Builds apps/web and publishes it to GitHub Pages
```

## Run it locally

```bash
cd apps/web
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in apps/web/dist
```

Requires Node.js 20.19 or newer (the deploy workflow uses Node 22).

## Deployment

Every push to `main` that touches `apps/web/` triggers the **Deploy web app to GitHub Pages** workflow. It builds the app with the `/reservation_app/` base path and publishes it. Progress is visible in the **Actions** tab; the site updates 1–2 minutes after a merge.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router 7 · lucide-react · qrcode.react · Web Speech API (audio guide)

Planned: NestJS backend with Prisma, React Native mobile app. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#roadmap).
