# Screens

Every screen of the web app, the route that opens it, and the Claude Design frame it was built from. All screens support light and dark mode and work from 360 px phones up to desktop.

## Navigation

| Width | Navigation |
|---|---|
| ≥ 1024 px | Sidebar (Dashboard, My trips, Wallet, Suggestions) with the account menu at the bottom; top bar with search, theme toggle, notifications. |
| < 1024 px | Top bar with logo, theme toggle, notifications and the account menu (avatar). Bottom tab bar with the four sections. Search appears from 768 px. |

The **account menu** shows name and email, Language, Settings, Help, Upgrade plan and Log out. It closes on an outside click or Esc.

## Screen map

| Design frame | Screen | Route | Notes |
|---|---|---|---|
| 1a / 1b | Dashboard | `/` | Hero for the next trip, trips map, Needs attention, At a glance, Coming up, Recently added, Upcoming trips |
| 5a, 2c, 2k | My trips | `/trips?tab=upcoming\|past\|unsorted` | Search, grid/list toggle, readiness badge per trip |
| 3a / 3b | Trip detail · Overview | `/trips/:tripId` | Day-by-day bookings, missing-night alert, trip suggestions, stop map |
| 3c, 3d, 3e | Trip detail · Day plan | `/trips/:tripId/plan?day=N` | Day pills, Booked / Planned / Free time, route map. `&nearby=1` opens the Nearby panel |
| 3f, 3g | Trip detail · Bookings | `/trips/:tripId/bookings` | Coverage strip, group by type or date, ⋯ menu, Mark as cancelled. `?open=ID` opens the detail drawer, `?ticket=ID` the QR ticket |
| — | Trip detail · Documents | `/trips/:tripId/documents` | Original email or PDF of every imported booking, upload area |
| 3h | Trip detail · Travel book | `/trips/:tripId/book` | Theme selector, spread preview, page thumbnails, photos by day |
| 7a | Order printed book | `/trips/:tripId/book/order?theme=` | Cover / spread / back preview, options, live total, confirmation |
| 4a–4d | Place detail + audio guide | `/places/:placeId` | `colosseum`, `forum`, `arch`, `clemente`, `trevi`, `pantheon` |
| 1w, 1t | Wallet | `/wallet?tab=today\|upcoming\|used` | Ticket-style passes, travel-day view, full-screen QR |
| 6a, 2g | Suggestions | `/suggestions?trip=` | Fix your trip, Fill your free time, Don't miss |

More screens built for the demo story:

| Design frame | Screen | Route | Notes |
|---|---|---|---|
| 1c / 1d | Dashboard · new user (empty state) | `/` in demo moment "New user" | Where to next hero, three ways to add a booking, sample trip preview |
| 1r | Dashboard · after the trip | `/` in demo moment "Back from Rome" | "Welcome back from Rome!" card → Create travel book; hero moves to Prague |
| 2m–2r | Add booking (Import → Review → Save) | modal from any **Add booking** button | Upload with reading progress, document preview with highlighted fields, confidence per field, "Please check" that must be resolved, suggested trip, saved summary |

Frame 2a (bulk import page for several files at once) is not built; the modal handles one booking at a time.

## Demo moments

The dashed **Demo** button in the top bar switches the story without reloading:

| Moment | "Today" | What changes |
|---|---|---|
| Before the trip | Fri 30 Oct 2026 | Default; Rome in 13 days, night of 15 Nov missing |
| New user | Fri 30 Oct 2026 | No trips: empty dashboard and empty My trips. "Explore with a sample trip" returns to the default |
| Back from Rome | Tue 17 Nov 2026 | Rome is completed, Welcome back card, next trip Prague |

Bookings added through the import flow stay for the browser session (also after a reload). Choosing **New user** clears them.

## Screen details

### Dashboard `/`
- **Hero:** next trip with a full-bleed photo and brand-blue gradient, "IN 13 DAYS", readiness bar, chips (Flight, Hotel check-in, Add hotel for 15 Nov) that link to Wallet, Bookings and Suggestions. On phones the photo sits behind the text with a darker overlay.
- **Trips map:** illustrated Europe map; dashed routes from home (Rotterdam) to each trip, the next trip in orange. Pins open the trip.
- **Needs attention:** the first gap found in any trip.
- **At a glance:** upcoming trips, bookings, countries (computed).
- **Coming up:** the next 3 deadlines.
- **Recently added:** the 3 newest bookings with their source, plus the forwarding address with a Copy button.
- **Upcoming trips:** cards for the trips after the next one.

### My trips `/trips`
Tabs Upcoming / Past / Unsorted with counts. Past shows a summary line (trips · countries · nights). Unsorted lists bookings without a trip, with "Add to trip" and "Create trip".

### Trip detail `/trips/:tripId`
Header with photo, dates, travelers, booking count, Share and Add booking. Tabs: Overview, Day plan, Bookings (count), Documents (count), Travel book (New). Tabs scroll sideways on phones.

- **Day plan:** a dot on a day pill marks a day with a problem. Free-time blocks show 2 suggestions and "Find something nearby". The first "Near me" tap shows the location permission dialog.
- **Bookings:** each card shows status (Confirmed / Cancelled), free-cancellation date, price and payment, confirmation code with copy, and a ticket action only where it makes sense (Show ticket, or "Check-in 11 Nov" for flights). The ⋯ menu has View details, Edit, View original email, type-specific actions (Check in online, Flight status / Get directions, Contact property), Add to calendar, Share, Move to another trip, Mark as cancelled, Delete. The drawer opens full screen on phones.

### Wallet `/wallet`
- **Today:** the travel day of 12 Nov — boarding pass (checked in, seat, gate, group, QR) and hotel pass, with a link to plan the free time.
- **Upcoming:** "All N passes available offline", a large "Next up" flight pass, then passes per trip. Colours by type: flight navy, hotel teal, train blue, tickets orange.
- **Used:** past trip passes, faded with a USED stamp.
- Tapping a QR opens a full-screen white view; multi-person tickets page with 1 / 2.

### Suggestions `/suggestions`
Trip chips, "Your travel style" card, three sections of 3 cards. Each card: photo, kind, facts, an italic reason, a primary action, Save and Not for me (with Undo).

### Travel book `/trips/:tripId/book` and order
Theme cards and segmented control switch every page at once. Pages: Cover, Route map, Day 2, Day 2 · Photos, Stats, Back cover. The order page keeps the selected theme.

### Place detail `/places/:placeId`
Photo header with "Your ticket" shortcut (if a booking gives access), audio guide card (play/pause, ±10 s, seek, speed, language, transcript), visit info and Nearby. Nearby items with a page link to it; others have a "+" button. "See all" opens the Day plan with the Nearby panel.

## Responsive rules

- Two-column layouts stack into one column below 1024 px.
- Card grids: 1 column on phones, 2 from 640 px, 3 from 1024 px.
- Horizontal content (trip tabs, day pills, coverage strip) scrolls sideways instead of wrapping.
- Modals and the QR views shrink to the screen width.
- Checked at 390 px, 820 px and 1440 px: no page scrolls horizontally.
