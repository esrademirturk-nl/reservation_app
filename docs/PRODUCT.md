# Product overview

## The problem

A single city trip easily ends up with bookings in five places: a hotel on Booking.com, flights in an airline email, a train ticket as a PDF, museum tickets in another inbox, a restaurant reservation in an app. Travellers lose time searching for the right confirmation, miss deadlines (free cancellation, online check-in) and only notice gaps, such as a night without a hotel, when it is too late.

## The idea

Waypad is the one place where all bookings for a trip come together, and the app actively looks after the trip:

1. **Before the trip:** collect bookings, group them into trips, show what is missing and what is coming up.
2. **During the trip:** a day plan, tickets ready offline, nearby ideas and an audio guide at each sight.
3. **After the trip:** a travel book made from your photos, matched to your plan.

## Target user

City travellers in Europe who book themselves (couples, friends, small families) and take 3–6 short trips a year. Launch scope for location-based features (Nearby, audio guide): the most visited European cities, starting with Rome, Paris and Amsterdam. Booking tracking and day plans work everywhere.

## Features

### Collect bookings
- Personal forwarding address (e.g. `esra@in.waypad.app`); every imported booking keeps its original email or PDF (**Documents** tab).
- Upload a PDF or screenshot, or add a booking manually.
- Bookings are grouped into trips by city and date. Bookings that match no trip land in **My trips → Unsorted**, where they can be added to a trip or start a new one.
- Fields the importer is unsure about are highlighted for the user to check (e.g. "Please check: check-out date").

### Look after the trip
- **Readiness score** per trip (4 checks): getting there, a stay for every night, getting back, at least one activity.
- **Needs attention:** nights without a stay, e.g. "Hotel missing for 15 Nov".
- **Trip coverage strip** on the Bookings tab: transport and every night on one timeline, gaps in orange.
- **Coming up:** free-cancellation deadlines, online check-in dates, ticket sale dates.
- **Recently added:** shows that imports work, with the source of each booking.

### Plan each day
- Day plan built from bookings (Booked), the user's own stops (Planned) and **free-time blocks** that hold suggestions.
- Walking or metro time between stops, a route map per day, the hotel for the night or an alert if there is none.
- **Near me:** asks for location only when tapped ("We use your location only for this search. It is not stored."), with a fallback to the hotel location. Shows exactly 3 ideas per category (Food, Coffee, Sights), each with a one-line reason, a budget filter and "Show 3 different ideas".
- **Suggestions** page per trip: *Fix your trip* (e.g. hotels for the missing night), *Fill your free time*, *Don't miss*. Save, "Not for me" and Undo. Based on the user's travel style (budget, interests).

### Travel day
- **Wallet:** passes styled like real tickets, grouped by trip. QR codes only where they exist in real life: flights show "Check-in opens …" until a boarding pass arrives, hotels show address and directions.
- **Today** view: the travel-day timeline with the checked-in boarding pass and the hotel.
- Full-screen QR for scanning, with paging for multi-person tickets.
- **Used:** passes from past trips.

### Explore
- **Place pages** (Colosseum, Roman Forum, Arch of Constantine, Basilica of San Clemente, Trevi Fountain, Pantheon): opening hours, your ticket, distance from the hotel, nearby places.
- **Audio guide:** 1–2 minute AI narration in the user's language, read aloud with a transcript that follows along; speed control and a mini player that keeps playing while browsing.

### Travel book
- Photos are matched to days and stops using time and location.
- Three themes: **Editorial** (serif, warm), **Bold** (heavy type, vivid), **Minimal** (monochrome).
- Pages: cover, route map, chapter openers, photo spreads with ticket stubs, stats, back cover.
- **Order printed book:** size, cover, paper, copies (extra copies −20%), delivery address, live total and confirmation. Printing and shipping through a print partner.

## User journey (demo story)

1. **First visit:** empty dashboard → forward a booking email.
2. **Bookings arrive:** dashboard fills up; "Recently added" shows the imports.
3. **The app protects you:** "Hotel missing for 15 Nov" → Bookings coverage strip → Suggestions offers hotels.
4. **Planning:** Day plan → free time with suggestions → Near me.
5. **Travel day:** Wallet → Today → boarding pass and QR.
6. **At the sight:** Colosseum page → audio guide.
7. **Back home:** Travel book → theme → order a printed copy.

See [DEMO-SCRIPT.md](DEMO-SCRIPT.md) for the presenter version.

## Business model (concept)

The app is free. Revenue comes from the printed travel book (one-off purchase), a Pro plan (more trips, shared trips, unlimited audio guides) and partner commission on suggested hotels and tours.

## Out of scope for the MVP

Payments inside the app, booking hotels or flights directly, group trips with permissions, offline maps.
