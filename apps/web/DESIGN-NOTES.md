# Waypad web — design integration notes

Source: Claude Design export (`Waypad *.dc.html`, color tokens `Waypad-Color.Light/Dark.tokens.json`).

## Screens → routes

| Design frame | Screen | Route | Status |
|---|---|---|---|
| 1a / 1b | Dashboard (light / dark) | `/` | ✅ built |
| 1c / 1d | Dashboard · empty state | `/` (no trips) | ⏳ |
| 1r | Dashboard · after trip (Welcome back) | `/` (demo date 17 Nov) | ⏳ |
| 5a, 2c, 2k | My trips (Upcoming, Past empty) | `/trips` | ⏳ |
| 3a / 3b | Trip detail · Overview | `/trips/:id` | ⏳ |
| 3c, 3d, 3e | Trip detail · Day plan, Nearby, location permission | `/trips/:id/plan` | ⏳ |
| 3f, 3g | Trip detail · Bookings, cancelled card | `/trips/:id/bookings` | ⏳ |
| 3h | Trip detail · Travel book | `/trips/:id/book` | ⏳ |
| 7a | Order printed book | `/trips/:id/book/order` | ⏳ |
| 4a–4d | Place detail + audio guide, mini player | `/places/:id` | ⏳ |
| 1w, 1t, 1v | Wallet (Upcoming, Today/travel day, photo variant) | `/wallet` | ⏳ |
| 6a, 2g | Suggestions | `/suggestions` | ⏳ |
| 2a, 2m–2r | Import / Add booking flow (Import → Review → Saved) | modal from "Add booking" | ⏳ |

Not in the export yet: order confirmation screen, Wallet "Used" tab, My trips "Unsorted" tab.

## One set of demo data

All screens read from `src/data/demo.ts`. Counts, countdowns, readiness and alerts are **computed**, not typed,
so they can't drift apart again. Demo "today" = **30 Oct 2026** (`DEMO_TODAY`).

Conflicts found in the designs and how they were settled:

| Conflict | Designs | Chosen |
|---|---|---|
| Rome hotel | Hotel Artemide (Trip detail, Place detail, Core screens) vs Hotel Roma Centro (Dashboard, Suggestions) | **Hotel Roma Centro**, Via Nazionale 22 |
| Rome flights | AZ 711/712 Istanbul ↔ Rome (QX7R2L) vs KLM AMS ↔ FCO (KX7Q2M) | **KLM AMS ↔ FCO**, KX7Q2M (user lives in Rotterdam) |
| Return flight time | AZ 712 12:10 vs KLM 18:20 | **18:20**; Leonardo Express moved to 15:35 |
| Day 2 dinner | Armando al Pantheon vs Da Pancrazio | **Da Pancrazio**, 20:00 |
| Colosseum time / ref | 10:30 vs 10:00; COL-88213 vs CLS-48213 | **10:00, COL-88213** |
| Forwarding address | trips@waypad.app vs esra@in.waypad.app | **esra@in.waypad.app** (personal) |
| Trips coming up | "3 trips coming up" but 4 trips shown | **computed → 4** |
| "This year" stats | 3 upcoming · 11 bookings | **computed → 4 · 17 · 4**, label "At a glance" |
| Readiness / missing | Amsterdam 1/4 "2 missing", Gothenburg 2/4 "1 missing" | **computed**: missing = 4 − readiness |
| Passenger name | Esra Duman vs Esra Demirtürk | **Esra Demirtürk** |

Readiness = 4 checks: getting there · every night has a stay · getting back · at least one activity.

## Tokens

`src/index.css` maps the exported light/dark tokens to CSS variables and Tailwind colors
(`bg-primary`, `text-ink`, `text-muted`, `bg-highlight`, `bg-tint`, `border-line` …). Theme toggle in the header.

## Map

The illustrated Europe outline comes from the dashboard design. The projection is fitted to the design's
Amsterdam / Prague / Rome anchors, and the view frames whatever trips exist (so Gothenburg fits).
Later: swap for MapLibre when real tiles are needed.
