# Demo script (5–7 minutes)

Live: https://esrademirturk-nl.github.io/reservation_app/

Before you start: open the link on a laptop (and optionally on a phone), light mode, browser sound on. If the network is unreliable, keep screenshots or a screen recording as a backup.

The demo is set on **Friday 30 October 2026**, 13 days before a Rome trip.

## 1. The problem (30 s)
"A four-day city trip easily has bookings in five places: the hotel on Booking.com, flights in a KLM email, a train ticket as a PDF, museum tickets in another inbox. Waypad brings them together and keeps an eye on the trip."

## 1b. First visit (30 s) — Demo → New user
- "A new user starts here: no trips yet." Point at the three ways in: forward an email, upload a file, add manually.
- Switch back with **Explore with a sample trip** (or Demo → Before the trip).

## 2. Dashboard (1 min) — `/`
- Hero: **Rome, in 13 days**, readiness 3/4.
- **Recently added:** "This hotel arrived two hours ago from Booking.com. I only forwarded the email to my personal Waypad address."
- **Needs attention:** "Waypad noticed I have no hotel for the night of 15 November."
- Point at **Coming up** (free cancellation ends 8 Nov) and the **map**.

## 3. The app protects the trip (1 min) — Trip detail → Bookings
- Click **Needs attention** → Bookings tab.
- **Trip coverage:** "Transport and every night on one line; the orange block is the missing night."
- Open **Hotel Roma Centro**: "If the importer isn't sure about a field, it asks me to check it."
- Click **No stay · Add** → Suggestions: three hotels within walking distance of the current one.
- **Fix it live:** back on the Bookings tab, click **Add booking** → *or try a sample confirmation*. Show the document preview, the confidence per field and the one orange **Please check** (two check-out times in the PDF). Pick 11:00 → **Save booking**. The summary says "All 4 nights now have a stay — trip ready 4/4", and the dashboard alert is gone.

## 4. Planning (1 min) — Day plan
- Day plan, **Fri 13**: Booked (Colosseum, dinner), Planned (Trevi) and **Free time** with suggestions.
- Click **Near me** → location dialog: "Location is used only for this search." → Use hotel location.
- Show the 3 ideas and the one-line reason for each.

## 5. Travel day (1 min) — Wallet
- **Upcoming:** "Tickets look like tickets. The flight has no QR yet; it says when check-in opens."
- **Today:** "On 12 November, after check-in, the boarding pass is here." Tap the QR → full screen for the gate.

## 6. At the Colosseum (45 s) — `/places/colosseum`
- Press play on the **audio guide**; the transcript follows along. Switch to **Türkçe**.
- Click **My trips** in the menu: the mini player keeps playing.

## 7. Back home (45 s) — Demo → Back from Rome
- The dashboard now says **Welcome back from Rome!** and the next trip is Prague.
- **Create travel book** → switch **Editorial → Bold → Minimal**.
- **Order printed book** → choose Medium hardcover → Place order.

## 8. Phone (optional, 20 s)
Open the same link on a phone: bottom tab bar, Wallet passes and the QR fit the screen.

## 9. How it's built (30 s)
React + TypeScript + Tailwind, one data model where gaps, readiness and deadlines are computed, deployed automatically with GitHub Actions. Next: NestJS backend with Prisma, email import, and a React Native app.

## Likely questions
- **How do bookings get in?** A personal forwarding address, PDF upload or manual entry. Parsing runs on the backend (next step); the demo uses prepared data.
- **Where do suggestions come from?** Reviews and the user's travel style (budget, interests), max 3 at a time so it stays a recommendation, not a list.
- **Is location stored?** No. It is used for one search, and there's a hotel-location fallback.
- **Why is the audio guide only in some cities?** Launch scope is the most visited European cities; booking tracking and day plans work everywhere.
- **How does it make money?** Printed travel books, a Pro plan, partner commission on suggestions (concept).
