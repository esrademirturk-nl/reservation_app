"""
Generates a synthetic bronze layer in the same format the API writes
(apps/api/src/lake/lake.service.ts), so the dbt models can be developed and
tested without real customer data.

    python data/sample/generate_lake.py [output_dir]   # default: data/sample/lake

Deterministic (fixed seed). Follows the export rules: users without the
product_analytics consent have no events, trips, reservations, preferences
or feedback — only their customer row and consent history.
"""
import json
import random
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

random.seed(42)
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent / "lake") / "lake" / "bronze"
SNAPSHOT = "2026-11-11"
TEXT_VERSION = "privacy-2026-11"
CITIES = [("Rome", "IT"), ("Paris", "FR"), ("Barcelona", "ES"), ("Lisbon", "PT"), ("Prague", "CZ"),
          ("Amsterdam", "NL"), ("Istanbul", "TR"), ("Vienna", "AT"), ("Copenhagen", "DK"), ("Gothenburg", "SE")]
INTERESTS = ["food", "museums", "history", "art", "architecture", "nature", "nightlife", "shopping", "local_life", "family"]
PROVIDERS = {"flight": ["KLM", "Transavia", "easyJet", "Ryanair", "ITA Airways"],
             "hotel": ["Booking.com", "Airbnb", "Expedia"], "train": ["NS International", "Eurostar", "Trenitalia"],
             "museum": ["Tiqets", "GetYourGuide"], "restaurant": ["TheFork"], "tour": ["GetYourGuide", "Viator"]}
PLACES = [{"place_id": str(uuid.UUID(int=random.getrandbits(128))), "city": "Rome", "category": c, "rank": i + 1,
           "price_level": p, "visit_minutes": m}
          for i, (c, p, m) in enumerate([("sight", None, 90), ("sight", None, 30), ("sight", None, 45), ("museum", None, 180),
                                          ("museum", None, 90), ("coffee", 1, 20), ("walk", None, 120), ("food", 1, 60),
                                          ("food", 2, 75), ("sight", None, 30), ("food", 3, 90), ("walk", None, 60)])]


def uid():
    return str(uuid.UUID(int=random.getrandbits(128)))


def iso(dt):
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def pg(dt):  # how PostgreSQL text looks with time zone UTC
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S+00")


tables = {k: [] for k in ["customers", "consents", "preferences", "trips", "reservations", "suggestion_feedback"]}
events = []
start = datetime(2026, 9, 1, tzinfo=timezone.utc)


def event(key, name, at, props, app="api"):
    events.append({"event_id": uid(), "customer_key": key, "event_name": name, "schema_version": 1,
                   "occurred_at": iso(at), "properties": props,
                   "context": {"app": app, "consent_version": TEXT_VERSION},
                   "ingested_at": iso(at + timedelta(minutes=random.randint(1, 15)))})


for n in range(300):
    key = uid()
    signup = start + timedelta(days=random.randint(0, 70), hours=random.randint(7, 22), minutes=random.randint(0, 59))
    budget = random.choices([1, 2, 3], [3, 5, 2])[0]
    tables["customers"].append({"customer_key": key, "language": random.choices(["en", "nl", "tr"], [5, 3, 2])[0],
                                "budget_level": budget, "home_city": random.choice(["Rotterdam", "Amsterdam", "Utrecht", "The Hague", None]),
                                "signup_date": signup.date().isoformat(), "is_deleted": False})
    granted = {"product_analytics": random.random() < 0.72, "personalisation": random.random() < 0.65,
               "ai_processing": random.random() < 0.8, "marketing": random.random() < 0.3}
    for purpose, g in granted.items():
        tables["consents"].append({"customer_key": key, "purpose": purpose, "granted": g, "text_version": TEXT_VERSION,
                                   "source": "onboarding", "recorded_at": pg(signup)})
    if granted["personalisation"] and random.random() < 0.08:  # some withdraw later
        tables["consents"].append({"customer_key": key, "purpose": "personalisation", "granted": False, "text_version": TEXT_VERSION,
                                   "source": "settings", "recorded_at": pg(signup + timedelta(days=random.randint(3, 20)))})
    if not granted["product_analytics"]:
        continue

    event(key, "account_created", signup, {"language": "en"})
    interests = random.sample(INTERESTS, random.randint(1, 4))
    pace = random.choice(["relaxed", "balanced", "packed"])
    party = random.choice(["solo", "couple", "friends", "family"])
    if random.random() < 0.75:
        at = signup + timedelta(minutes=random.randint(2, 30))
        event(key, "onboarding_completed", at, {"interests_count": len(interests), "pace": pace, "travel_party": party, "budget_level": budget})
        tables["preferences"].append({"customer_key": key, "pace": pace, "interests": interests, "travel_party": party,
                                      "home_airport": "AMS", "preferred_providers": random.sample(PROVIDERS["flight"], 1),
                                      "seat": random.choice(["window", "aisle", "none"]), "updated_at": pg(at)})
    for _ in range(random.choices([0, 1, 2, 3, 4], [2, 4, 3, 2, 1])[0]):
        created = signup + timedelta(days=random.randint(0, 20), hours=random.randint(0, 12))
        if created > datetime(2026, 11, 11, tzinfo=timezone.utc):
            continue
        lead = random.randint(5, 120)
        trip_start = created.date() + timedelta(days=lead)
        nights = random.choices([1, 2, 3, 4, 5, 7], [1, 4, 5, 3, 2, 1])[0]
        city, cc = random.choice(CITIES)
        trip_id = uid()
        travelers = 1 if party == "solo" else random.randint(2, 4)
        tables["trips"].append({"trip_id": trip_id, "customer_key": key, "city": city, "country_code": cc,
                                "start_date": trip_start.isoformat(), "end_date": (trip_start + timedelta(days=nights)).isoformat(),
                                "travelers": travelers, "created_at": pg(created), "is_deleted": False})
        event(key, "trip_created", created, {"city": city, "country_code": cc, "nights": nights, "travelers": travelers, "days_until_start": lead})
        kinds = ["flight", "hotel", "flight"] + random.sample(["museum", "restaurant", "tour", "train"], random.randint(0, 3))
        for i, kind in enumerate(kinds):
            added = created + timedelta(hours=random.randint(1, 72))
            day = trip_start + (timedelta(days=nights) if i == 2 else timedelta(days=random.randint(0, max(0, nights - 1))))
            source = random.choices(["email", "pdf", "manual"], [5, 3, 2])[0]
            flagged = random.choices([0, 1, 2, 3], [6, 2, 1, 1])[0] if source != "manual" else 0
            price = {"flight": random.randint(60, 260), "hotel": random.randint(80, 180) * nights * budget,
                     "train": random.randint(30, 120), "museum": random.randint(15, 40), "restaurant": random.randint(30, 90),
                     "tour": random.randint(25, 70)}[kind] * 100
            status = random.choices(["confirmed", "pending", "cancelled"], [8, 1, 1])[0]
            starts = datetime(day.year, day.month, day.day, random.randint(7, 20), random.choice([0, 15, 30, 45]))
            ends = starts + (timedelta(days=nights) if kind == "hotel" else timedelta(hours=2))
            rid = uid()
            tables["reservations"].append({"reservation_id": rid, "trip_id": trip_id, "customer_key": key, "type": kind,
                                           "provider": random.choice(PROVIDERS[kind]), "source": source, "status": status,
                                           "start_at": starts.strftime("%Y-%m-%d %H:%M:%S"), "end_at": ends.strftime("%Y-%m-%d %H:%M:%S"),
                                           "price_cents": price, "currency": "EUR", "guests": travelers, "created_at": pg(added),
                                           "fields_flagged": flagged, "is_deleted": False})
            if source == "manual":
                event(key, "booking_added_manually", added, {"type": kind, "matched_trip": True})
                continue
            reader = random.choices(["claude", "rules"], [4, 1])[0]
            event(key, "booking_imported", added, {"type": kind, "source": source, "reader": reader, "fields_flagged": flagged, "matched_trip": random.random() < 0.9})
            for f in random.sample(["startAt", "endAt", "priceCents", "location", "title"], min(flagged, random.randint(0, flagged))):
                event(key, "booking_field_corrected", added + timedelta(minutes=2), {"type": kind, "field": f, "source": source})
            if status == "confirmed":
                mins = random.randint(1, 600)
                event(key, "booking_confirmed", added + timedelta(minutes=mins), {"type": kind, "source": source, "minutes_since_import": mins})
        if city == "Rome":
            for rank, place in enumerate(random.sample(PLACES, 4)):
                at = created + timedelta(days=1)
                event(key, "suggestion_feedback", at, {"action": "shown", "section": "free", "item_kind": "place", "rank_position": rank})
                action = random.choices(["accepted", "dismissed", "not_for_me", None], [3, 2, 1, 4])[0]
                if granted["personalisation"]:
                    tables["suggestion_feedback"].append({"customer_key": key, "trip_id": trip_id, "item_ref": place["place_id"], "action": "shown", "at": pg(at)})
                if action and (granted["personalisation"] or action in ("dismissed", "not_for_me")):
                    tables["suggestion_feedback"].append({"customer_key": key, "trip_id": trip_id, "item_ref": place["place_id"], "action": action, "at": pg(at + timedelta(seconds=40))})
                if action:
                    event(key, "suggestion_feedback", at + timedelta(seconds=40), {"action": action, "section": "free", "item_kind": "place", "rank_position": rank})
    for _ in range(random.randint(2, 25)):
        event(key, "screen_viewed", signup + timedelta(days=random.randint(0, 60), minutes=random.randint(0, 900)),
              {"screen": random.choice(["dashboard", "trip", "wallet", "suggestions", "place"])}, app=random.choice(["web", "ios", "android"]))

tables["places"] = PLACES


def write(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows))


for name, rows in tables.items():
    write(OUT / "snapshots" / name / f"snapshot_date={SNAPSHOT}" / "part-0.jsonl", rows)
events.sort(key=lambda e: e["ingested_at"])
by_day = {}
for e in events:
    by_day.setdefault(e["ingested_at"][:10], []).append(e)
for day, rows in by_day.items():
    write(OUT / "events" / f"ingest_date={day}" / "events-sample.jsonl", rows)
# a duplicate delivery, as can happen when a shipper retries — silver must remove it
write(OUT / "events" / f"ingest_date={max(by_day)}" / "events-retry.jsonl", events[-5:])
print(f"wrote {sum(len(v) for v in tables.values())} snapshot rows and {len(events)} events to {OUT}")
