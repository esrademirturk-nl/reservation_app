import 'dotenv/config';
import { hashPassword } from '../../auth/password';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import data from './demo-data.json';
import guide from './rome-guide.json';

type PlaceCategory = (typeof schema.placeCategoryEnum.enumValues)[number];

/**
 * Loads the same demo story the web app shows (Esra, Rome 12–16 Nov 2026, …).
 * Idempotent: it wipes the demo user's data first, so it can be run again at any time.
 * Run with `npm run db:seed`.
 */

type DemoBooking = (typeof data.bookings)[number] & {
  end?: string;
  freeCancellationUntil?: string;
  checkInOpens?: string;
};

export const DEMO_EMAIL = 'esra@demo.waypad.app';

const sourceMap = {
  'Booking.com': 'booking_com',
  Email: 'email',
  PDF: 'pdf',
  Manual: 'manual',
} as const;

/** Live guide is switched on for the launch cities only. */
/** Demo login (public on purpose — it only unlocks the seeded demo account). */
export const DEMO_PASSWORD = 'waypad-demo1';

const LIVE_GUIDE = new Set(['Rome', 'Paris', 'Amsterdam']);

export async function seed(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is not set');
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool, { schema, casing: 'snake_case' });

  try {
    await db.transaction(async (tx) => {
      // start clean: deleting the user cascades to memberships, reservations, documents …
      const existing = await tx.query.users.findFirst({
        where: (u, { eq }) => eq(u.email, DEMO_EMAIL),
      });
      if (existing) {
        const memberships = await tx.query.tripMembers.findMany({
          where: (m, { eq }) => eq(m.userId, existing.id),
        });
        // events are keyed by the pseudonym, not the user, so remove them explicitly
        const key = await tx.query.customerKeys.findFirst({
          where: (k, { eq }) => eq(k.userId, existing.id),
        });
        if (key)
          await tx
            .delete(schema.eventOutbox)
            .where(eq(schema.eventOutbox.customerKey, key.customerKey));
        await tx.delete(schema.users).where(eq(schema.users.id, existing.id));
        for (const m of memberships)
          await tx.delete(schema.trips).where(eq(schema.trips.id, m.tripId));
      }

      const [user] = await tx
        .insert(schema.users)
        .values({
          email: DEMO_EMAIL,
          passwordHash: await hashPassword(DEMO_PASSWORD),
          fullName: data.user.fullName,
          forwardAlias: data.user.forwardAddress.split('@')[0],
          homeCity: data.user.home,
          language: 'en',
          budgetLevel: 2,
        })
        .returning();

      // cities (upsert by name + country)
      const cityIds = new Map<string, number>();
      for (const t of data.trips) {
        const [city] = await tx
          .insert(schema.cities)
          .values({
            name: t.city,
            country: t.country,
            countryCode: t.countryCode,
            lat: t.lat,
            lon: t.lon,
            liveGuideEnabled: LIVE_GUIDE.has(t.city),
          })
          .onConflictDoUpdate({
            target: [schema.cities.name, schema.cities.countryCode],
            set: { lat: t.lat, lon: t.lon },
          })
          .returning();
        cityIds.set(t.id, city.id);
      }

      // trips + owner membership
      const tripIds = new Map<string, string>();
      for (const t of data.trips) {
        const [trip] = await tx
          .insert(schema.trips)
          .values({
            slug: t.id,
            cityId: cityIds.get(t.id)!,
            startDate: t.start,
            endDate: t.end,
            travelers: t.travelers,
            coverPhotoUrl: t.photo,
            coverPhotoCredit: t.photoCredit,
          })
          .returning();
        tripIds.set(t.id, trip.id);
        await tx
          .insert(schema.tripMembers)
          .values({ tripId: trip.id, userId: user.id, role: 'owner' });
      }

      // reservations ('unsorted' → no trip)
      const bookings = data.bookings as DemoBooking[];
      await tx.insert(schema.reservations).values(
        bookings.map((b) => ({
          userId: user.id,
          tripId: tripIds.get(b.tripId) ?? null,
          type: b.type as (typeof schema.bookingTypeEnum.enumValues)[number],
          title: b.title,
          provider: b.provider,
          source: sourceMap[b.source as keyof typeof sourceMap],
          startAt: b.start.replace('T', ' '),
          endAt: b.end ? b.end.replace('T', ' ') : null,
          location: b.location,
          ref: b.ref,
          priceCents: Math.round(b.price * 100),
          paid: b.paid,
          status: b.status as 'confirmed' | 'cancelled',
          freeCancellationUntil: b.freeCancellationUntil ?? null,
          checkInOpens: b.checkInOpens ?? null,
          guests: b.guests ?? 1,
          hasPass: b.hasPass,
          createdAt: new Date(b.addedAt),
        })),
      );

      // Rome guide: places + audio-guide texts (shared by everyone, upserted)
      const romeCity = cityIds.get('rome')!;
      const placeIds = new Map<string, string>();
      for (const p of guide.places) {
        const { narrations, ...place } = p;
        const values = {
          ...place,
          cityId: romeCity,
          category: place.category as PlaceCategory,
        };
        const [row] = await tx
          .insert(schema.places)
          .values(values)
          .onConflictDoUpdate({
            target: [schema.places.cityId, schema.places.slug],
            set: values,
          })
          .returning();
        placeIds.set(p.slug, row.id);
        await tx
          .delete(schema.placeNarrations)
          .where(eq(schema.placeNarrations.placeId, row.id));
        if (narrations.length)
          await tx.insert(schema.placeNarrations).values(
            narrations.map((n) => ({
              placeId: row.id,
              language: n.language as 'en' | 'tr' | 'nl',
              text: n.text,
              seconds: n.seconds,
              source: 'curated' as const,
            })),
          );
      }

      // Rome day plan: the stops Esra planned herself (bookings are added to the plan automatically)
      const romeTrip = tripIds.get('rome')!;
      for (const date of [...new Set(guide.plan.map((x) => x.date))]) {
        const [day] = await tx
          .insert(schema.dayPlans)
          .values({ tripId: romeTrip, date })
          .returning();
        await tx.insert(schema.planItems).values(
          guide.plan
            .filter((x) => x.date === date)
            .map((x, i) => ({
              dayPlanId: day.id,
              kind: 'planned' as const,
              placeId: x.place ? placeIds.get(x.place) : null,
              title: x.title,
              subtitle: x.subtitle,
              startTime: x.startTime,
              position: i,
            })),
        );
      }

      await seedCustomerData(tx, user.id, tripIds);
    });

    // counts for the demo account only (other users may exist, e.g. in tests)
    const demo = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, DEMO_EMAIL),
      with: { memberships: true, reservations: true },
    });
    return {
      users: demo ? 1 : 0,
      trips: demo?.memberships.length ?? 0,
      reservations: demo?.reservations.length ?? 0,
    };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seed()
    .then((c) =>
      console.log(
        `Seeded demo data: ${c.users} user, ${c.trips} trips, ${c.reservations} reservations`,
      ),
    )
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

type Tx = Parameters<
  Parameters<ReturnType<typeof drizzle<typeof schema>>['transaction']>[0]
>[0];

/**
 * The demo account's consents, preferences and a usage history that matches the demo story,
 * so the data pipeline (docs/DATA-ARCHITECTURE.md) has something to show.
 */
async function seedCustomerData(
  tx: Tx,
  userId: string,
  tripIds: Map<string, string>,
) {
  const signup = new Date('2026-09-01T09:30:00Z');
  const [{ customerKey }] = await tx
    .insert(schema.customerKeys)
    .values({ userId, createdAt: signup })
    .returning();
  await tx.insert(schema.userConsents).values(
    (
      [
        'product_analytics',
        'personalisation',
        'ai_processing',
        'marketing',
      ] as const
    ).map((purpose) => ({
      userId,
      purpose,
      granted: purpose !== 'marketing',
      textVersion: 'privacy-2026-11',
      source: 'onboarding',
      recordedAt: signup,
    })),
  );
  await tx.insert(schema.userPreferences).values({
    userId,
    pace: 'balanced',
    interests: ['food', 'history', 'art'],
    travelParty: 'couple',
    homeAirport: 'AMS',
    preferredProviders: ['KLM'],
    seat: 'window',
    updatedAt: new Date(signup.getTime() + 5 * 60_000),
  });

  const ctx = { app: 'api', consent_version: 'privacy-2026-11' };
  const ev = (
    eventName: string,
    occurredAt: Date,
    properties: Record<string, unknown>,
  ) => ({
    customerKey,
    eventName,
    occurredAt,
    properties,
    context: ctx,
    shippedAt: null,
  });
  const events = [
    ev('account_created', signup, { language: 'en' }),
    ev('onboarding_completed', new Date(signup.getTime() + 5 * 60_000), {
      interests_count: 3,
      pace: 'balanced',
      travel_party: 'couple',
      budget_level: 2,
    }),
  ];
  const trips = await tx.query.trips.findMany({
    where: (t, { inArray }) => inArray(t.id, [...tripIds.values()]),
    with: { city: true, reservations: true },
  });
  for (const t of trips) {
    const firstBooking =
      t.reservations.map((r) => r.createdAt.getTime()).sort()[0] ??
      Date.parse(`${t.startDate}T00:00:00Z`) - 60 * 86_400_000;
    const created = new Date(
      Math.max(signup.getTime() + 3_600_000, firstBooking - 3_600_000),
    );
    const days = (a: string, b: string) =>
      Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
    events.push(
      ev('trip_created', created, {
        city: t.city.name,
        country_code: t.city.countryCode,
        nights: days(t.startDate, t.endDate),
        travelers: t.travelers,
        days_until_start: days(created.toISOString().slice(0, 10), t.startDate),
      }),
    );
    for (const r of t.reservations.filter((x) => x.source !== 'manual')) {
      events.push(
        ev('booking_imported', r.createdAt, {
          type: r.type,
          source: r.source,
          reader: 'claude',
          fields_flagged: r.fieldConfidence
            ? Object.keys(r.fieldConfidence).length
            : 0,
          matched_trip: true,
        }),
      );
      if (r.status === 'confirmed')
        events.push(
          ev(
            'booking_confirmed',
            new Date(r.createdAt.getTime() + 7 * 60_000),
            { type: r.type, source: r.source, minutes_since_import: 7 },
          ),
        );
    }
  }
  await tx.insert(schema.eventOutbox).values(events);
}
