import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../src/db/seed/seed';
import { createTestApp, uniqueEmail } from './app';

describe('Trips & reservations (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let demo: { Authorization: string };

  const signUp = async () => {
    const res = await http()
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('trip'),
        password: 'secret-pass1',
        fullName: 'Test User',
      })
      .expect(201);
    return { Authorization: `Bearer ${res.body.accessToken}` };
  };

  beforeAll(async () => {
    app = await createTestApp();
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .expect(200);
    demo = { Authorization: `Bearer ${res.body.accessToken}` };
  });
  afterAll(() => app.close());

  describe('demo story (today = 30 Oct 2026)', () => {
    it('dashboard matches the web demo', async () => {
      const { body } = await http()
        .get('/api/v1/dashboard?today=2026-10-30')
        .set(demo)
        .expect(200);
      expect(body.nextTrip).toMatchObject({
        slug: 'rome',
        city: { name: 'Rome' },
        nights: 4,
      });
      expect(body.nextTrip.readiness.done).toBe(3);
      expect(body.gaps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'stay',
            date: '2026-11-15',
            title: 'Hotel missing for 15 Nov',
          }),
        ]),
      );
      expect(body.deadlines.length).toBeGreaterThan(0);
      expect(body.deadlines[0].date >= '2026-10-30').toBe(true);
      expect(body.recentlyAdded).toHaveLength(3);
      expect(body.stats.upcomingTrips).toBe(body.upcoming.length);
    });

    it('lists upcoming and past trips', async () => {
      const up = await http()
        .get('/api/v1/trips?when=upcoming&today=2026-10-30')
        .set(demo)
        .expect(200);
      const past = await http()
        .get('/api/v1/trips?when=past&today=2026-10-30')
        .set(demo)
        .expect(200);
      expect(up.body[0].slug).toBe('rome');
      expect(
        past.body.every((t: { endDate: string }) => t.endDate < '2026-10-30'),
      ).toBe(true);
      expect(up.body.length + past.body.length).toBe(5);
    });

    it('returns the Rome trip with a day-by-day timeline', async () => {
      const list = await http()
        .get('/api/v1/trips?when=upcoming&today=2026-10-30')
        .set(demo);
      const { body } = await http()
        .get(`/api/v1/trips/${list.body[0].id}?today=2026-10-30`)
        .set(demo)
        .expect(200);
      expect(body.days.map((d: { date: string }) => d.date)).toEqual([
        '2026-11-12',
        '2026-11-13',
        '2026-11-14',
        '2026-11-15',
        '2026-11-16',
      ]);
      expect(body.days[0].events[0]).toMatchObject({
        at: '2026-11-12T08:40',
        label: '',
      });
      expect(
        body.reservations.find((r: { ref: string }) => r.ref === 'KX7Q2M'),
      ).toMatchObject({ type: 'flight', startAt: '2026-11-12T08:40' });
    });
  });

  describe('a new user plans a trip', () => {
    let me: { Authorization: string };
    let tripId: string;

    beforeAll(async () => {
      me = await signUp();
    });

    it('creates a trip in a known city and gets a unique slug', async () => {
      const a = await http()
        .post('/api/v1/trips')
        .set(me)
        .send({
          city: 'rome',
          countryCode: 'it',
          startDate: '2027-03-01',
          endDate: '2027-03-04',
          travelers: 2,
        })
        .expect(201);
      expect(a.body).toMatchObject({
        slug: 'rome',
        city: { name: 'Rome' },
        nights: 3,
        role: 'owner',
        readiness: { done: 0 },
      });
      expect(a.body.gaps.map((g: { kind: string }) => g.kind)).toEqual([
        'transport',
        'stay',
        'stay',
        'stay',
        'transport',
      ]);
      tripId = a.body.id;
      const b = await http()
        .post('/api/v1/trips')
        .set(me)
        .send({
          city: 'Rome',
          countryCode: 'IT',
          startDate: '2027-06-01',
          endDate: '2027-06-02',
        })
        .expect(201);
      expect(b.body.slug).toBe('rome-2');
    });

    it('needs coordinates for a city it does not know yet', async () => {
      // cities are shared between users, so use a name no earlier run has created
      const city = `Testville ${Date.now()}`;
      const res = await http()
        .post('/api/v1/trips')
        .set(me)
        .send({
          city,
          countryCode: 'BE',
          startDate: '2027-04-01',
          endDate: '2027-04-03',
        })
        .expect(422);
      expect(res.body.code).toBe('CITY_UNKNOWN');
      await http()
        .post('/api/v1/trips')
        .set(me)
        .send({
          city,
          countryCode: 'BE',
          country: 'Belgium',
          lat: 51.05,
          lon: 3.72,
          startDate: '2027-04-01',
          endDate: '2027-04-03',
        })
        .expect(201);
    });

    it('rejects a trip that ends before it starts', async () => {
      const res = await http()
        .post('/api/v1/trips')
        .set(me)
        .send({
          city: 'Rome',
          countryCode: 'IT',
          startDate: '2027-03-05',
          endDate: '2027-03-01',
        })
        .expect(400);
      expect(res.body.code).toBe('INVALID_DATES');
    });

    it('adds bookings; readiness and gaps follow', async () => {
      const add = (body: object) =>
        http().post('/api/v1/reservations').set(me).send(body).expect(201);
      const flight = await add({
        type: 'flight',
        title: 'ITA · AMS → FCO',
        provider: 'ITA',
        startAt: '2027-03-01T07:15',
        ref: 'ABC123',
        priceCents: 15900,
      });
      expect(flight.body).toMatchObject({
        tripId,
        source: 'manual',
        status: 'confirmed',
        needsCheck: [],
      });
      await add({
        type: 'hotel',
        title: 'Hotel Test',
        provider: 'Booking.com',
        startAt: '2027-03-01T15:00',
        endAt: '2027-03-04T11:00',
        ref: 'H1',
        priceCents: 42000,
      });
      await add({
        type: 'museum',
        title: 'Vatican Museums',
        provider: 'Vatican',
        startAt: '2027-03-02T09:00',
        ref: 'V1',
        tripId,
      });

      const t = await http().get(`/api/v1/trips/${tripId}`).set(me).expect(200);
      expect(t.body.readiness).toMatchObject({
        done: 3,
        checks: { return: false },
      });
      expect(t.body.gaps).toEqual([
        expect.objectContaining({ kind: 'transport', date: '2027-03-04' }),
      ]);
      expect(t.body.totalCents).toBe(15900 + 42000);
      expect(
        t.body.days[0].events.map((e: { label: string }) => e.label),
      ).toEqual(['', 'Check-in']);
    });

    it('keeps a booking outside every trip in Unsorted, and can move it later', async () => {
      const res = await http()
        .post('/api/v1/reservations')
        .set(me)
        .send({
          type: 'restaurant',
          title: 'Dinner',
          provider: 'Da Enzo',
          startAt: '2027-09-09T20:00',
          ref: 'D1',
        })
        .expect(201);
      expect(res.body.tripId).toBeNull();
      const unsorted = await http()
        .get('/api/v1/reservations?unsorted=true')
        .set(me)
        .expect(200);
      expect(unsorted.body.map((r: { id: string }) => r.id)).toContain(
        res.body.id,
      );

      const moved = await http()
        .patch(`/api/v1/reservations/${res.body.id}`)
        .set(me)
        .send({ tripId })
        .expect(200);
      expect(moved.body.tripId).toBe(tripId);
      const back = await http()
        .patch(`/api/v1/reservations/${res.body.id}`)
        .set(me)
        .send({ tripId: null })
        .expect(200);
      expect(back.body.tripId).toBeNull();
    });

    it('cancelling a booking removes it from readiness; validation catches bad dates', async () => {
      const list = await http()
        .get(`/api/v1/reservations?tripId=${tripId}`)
        .set(me)
        .expect(200);
      const hotel = list.body.find((r: { type: string }) => r.type === 'hotel');
      await http()
        .post(`/api/v1/reservations/${hotel.id}/cancel`)
        .set(me)
        .expect(200);
      const t = await http().get(`/api/v1/trips/${tripId}`).set(me);
      expect(t.body.readiness.checks.stay).toBe(false);

      const bad = await http()
        .patch(`/api/v1/reservations/${hotel.id}`)
        .set(me)
        .send({ endAt: '2027-02-01T10:00' })
        .expect(400);
      expect(bad.body.code).toBe('INVALID_DATES');
      await http()
        .patch(`/api/v1/reservations/${hotel.id}`)
        .set(me)
        .send({ startAt: '1 March' })
        .expect(400);
    });

    it('does not show one user’s trips or bookings to another', async () => {
      const stranger = await signUp();
      await http().get(`/api/v1/trips/${tripId}`).set(stranger).expect(404);
      const mine = await http()
        .get(`/api/v1/reservations?tripId=${tripId}`)
        .set(me);
      await http()
        .get(`/api/v1/reservations/${mine.body[0].id}`)
        .set(stranger)
        .expect(404);
      await http()
        .patch(`/api/v1/reservations/${mine.body[0].id}`)
        .set(stranger)
        .send({ paid: true })
        .expect(404);
      await http()
        .post('/api/v1/reservations')
        .set(stranger)
        .send({
          type: 'tour',
          title: 'x',
          provider: 'x',
          startAt: '2027-03-02T10:00',
          ref: 'x',
          tripId,
        })
        .expect(404);
      const theirs = await http()
        .get('/api/v1/trips')
        .set(stranger)
        .expect(200);
      expect(theirs.body).toEqual([]);
    });

    it('deleting a trip sends its bookings to Unsorted', async () => {
      await http().delete(`/api/v1/trips/${tripId}`).set(me).expect(204);
      await http().get(`/api/v1/trips/${tripId}`).set(me).expect(404);
      const unsorted = await http()
        .get('/api/v1/reservations?unsorted=true')
        .set(me);
      expect(
        unsorted.body.some((r: { ref: string }) => r.ref === 'ABC123'),
      ).toBe(true);
    });
  });
});
