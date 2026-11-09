# Data model

The web app runs on demo data in `apps/web/src/data/`. The shapes below are the contract the NestJS backend will serve later, so they double as the first draft of the API.

## Core types (`data/types.ts`)

### Trip
| Field | Type | Notes |
|---|---|---|
| `id` | string | `rome`, `prague`, … |
| `city`, `country`, `countryCode` | string | `countryCode` is ISO 3166-1 alpha-2 |
| `start`, `end` | ISO date | `end` is the departure day; nights = `end − start` |
| `photo`, `photoCredit` | string | Hero photo (Wikimedia Commons in the demo) |
| `lat`, `lon` | number | Used for the trips map |
| `travelers` | number | |
| `weatherC` | number? | Forecast shown in the hero |

### Booking
| Field | Type | Notes |
|---|---|---|
| `id`, `tripId` | string | `tripId = 'unsorted'` when no trip matches |
| `type` | `flight` · `hotel` · `train` · `museum` · `restaurant` · `tour` | Decides icon, pass colour and actions |
| `title`, `provider` | string | e.g. "KLM · AMS → FCO", "KLM" |
| `source` | `Booking.com` · `Email` · `PDF` · `Manual` | Where it came from; non-manual bookings have an original document |
| `start`, `end?` | ISO local datetime | For hotels: check-in and check-out |
| `location` | string | Address or route |
| `ref` | string | Confirmation code (one PNR can cover both flights) |
| `price`, `paid` | number (EUR), boolean | |
| `status` | `confirmed` · `cancelled` | |
| `freeCancellationUntil?` | ISO date | Creates a deadline |
| `checkInOpens?` | ISO date | Flights; creates a deadline and replaces the QR until check-in |
| `guests?` | number | Multi-person tickets page through QR codes |
| `hasPass` | boolean | True only when a scannable QR exists now |
| `addedAt` | ISO datetime | Drives "Recently added" |

### Derived types
- **Gap** `{ tripId, kind: 'stay' | 'transport', date, title, detail }` — a night without a stay.
- **Deadline** `{ date, title, subtitle, bookingId? }` — free cancellation, check-in opening, ticket sale.
- **TripEvent** — a booking placed on the timeline; hotels produce two events (check-in and check-out).

## Supporting data

| File | Contents |
|---|---|
| `plan.ts` | `PlannedStop` (user's own stops), `FreeTime` (gaps in the day with suggestions), positions on the schematic day map, trip-level suggestions |
| `suggestions.ts` | `SuggestionSection` per trip: Fix your trip / Fill your free time / Don't miss, each with 3 `Suggestion`s (kind, facts, reason, action, tags) |
| `places.ts` | `Place` (name, address, hours, distance from hotel, narration per language, length in seconds, nearby places) and the supported languages (`en`, `tr`, `nl`) |
| `colosseum-guide.json` | Colosseum narration in three languages |

## Computed rules (`lib/trips.ts`)

Nothing that can be calculated is stored. This keeps every screen consistent.

| Value | Rule |
|---|---|
| Countdown | Days from `DEMO_TODAY` to `trip.start` |
| Upcoming / past | Upcoming while `trip.end ≥ today`; otherwise completed |
| Covered nights | Every night between a hotel's check-in and check-out date |
| Missing nights → Gap | Trip nights (`start … end − 1`) not covered by a hotel |
| Readiness (0–4) | Outbound transport on `start` · every night covered · return transport on `end` · at least one museum, tour or restaurant |
| Missing count | `4 − readiness` |
| Deadlines | Free-cancellation dates, check-in opening dates (while no pass exists) and extra sale dates; future only, sorted, first 3 |
| Recently added | Newest `addedAt` first |
| At a glance | Upcoming trips, their bookings, distinct countries |
| Trip total | Sum of booking prices |
| Documents | Bookings whose `source` is not `Manual` |

## Demo data

- **Today:** `DEMO_TODAY = 2026-10-30` (Friday). Relative times ("2h ago") use 30 Oct 18:05.
- **User:** Esra Demirtürk, home Rotterdam, forwarding address `esra@in.waypad.app`.
- **Trips:** Rome 12–16 Nov 2026 (7 bookings, night of 15 Nov missing → readiness 3/4) · Prague 24–28 Dec 2026 (7, ready) · Amsterdam 6–8 Feb 2027 (1) · Gothenburg 14–18 May 2027 (2) · Paris 29 Sep–1 Oct 2026 (completed, 2).
- **Unsorted:** Anne Frank House tickets (14 Mar 2027), Eurostar Rotterdam → London (2 Apr 2027).

### Conflicts in the designs and how they were settled

The Claude Design screens used different data for the same Rome trip. The demo uses one set:

| Conflict | In the designs | Chosen |
|---|---|---|
| Rome hotel | Hotel Artemide vs Hotel Roma Centro | **Hotel Roma Centro**, Via Nazionale 22 |
| Rome flights | AZ 711/712 Istanbul ↔ Rome vs KLM AMS ↔ FCO | **KLM AMS ↔ FCO**, KX7Q2M (home is Rotterdam) |
| Return flight | 12:10 vs 18:20 | **18:20**; Leonardo Express to the airport at 15:35 |
| Day 2 dinner | Armando al Pantheon vs Da Pancrazio | **Da Pancrazio**, 20:00 |
| Colosseum entry | 10:30 vs 10:00; COL-88213 vs CLS-48213 | **10:00, COL-88213** (audio guide text adjusted) |
| Forwarding address | trips@waypad.app vs esra@in.waypad.app | **esra@in.waypad.app** (personal) |
| Trips coming up | "3 trips coming up" with 4 trips shown | **computed → 4** |
| Stats card | 3 upcoming · 11 bookings | **computed → 4 · 17 · 4**, titled "At a glance" |
| Missing per trip | Amsterdam 1/4 "2 missing", Gothenburg 2/4 "1 missing" | **computed:** missing = 4 − readiness |
| Passenger name | Esra Duman vs Esra Demirtürk | **Esra Demirtürk** |

## Moving to a backend

Planned entities for NestJS + Prisma: `User`, `Trip`, `Booking`, `Document` (original email/PDF, linked to a booking), `PlanItem` (planned stop or free time), `Place`, `Narration` (place × language), `Suggestion`, `TravelBook` and `Order`. Gaps, readiness and deadlines stay computed on the server, never stored.
