import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import data from './demo-data.json';

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

const DEMO_EMAIL = 'esra@demo.waypad.app';

const sourceMap = {
  'Booking.com': 'booking_com',
  Email: 'email',
  PDF: 'pdf',
  Manual: 'manual',
} as const;

/** Live guide is switched on for the launch cities only. */
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
        await tx.delete(schema.users).where(eq(schema.users.id, existing.id));
        for (const m of memberships)
          await tx.delete(schema.trips).where(eq(schema.trips.id, m.tripId));
      }

      const [user] = await tx
        .insert(schema.users)
        .values({
          email: DEMO_EMAIL,
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
    });

    const counts = {
      users: (await db.select().from(schema.users)).length,
      trips: (await db.select().from(schema.trips)).length,
      reservations: (await db.select().from(schema.reservations)).length,
    };
    return counts;
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
