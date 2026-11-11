import { INestApplication } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { DB, type Database } from '../src/db/db.module';
import { customerKeys, eventOutbox, userConsents } from '../src/db/schema';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../src/db/seed/seed';
import { LakeService } from '../src/lake/lake.service';
import { createTestApp, uniqueEmail } from './app';

const ALL = {
  product_analytics: true,
  personalisation: true,
  ai_processing: true,
  marketing: false,
};

describe('Customer data: consents, preferences, events, lake (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;
  const http = () => request(app.getHttpServer());

  const signUp = async (consents?: object) => {
    const res = await http()
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('cust'),
        password: 'secret-pass1',
        fullName: 'Data Tester',
        consents,
      })
      .expect(201);
    return {
      auth: { Authorization: `Bearer ${res.body.accessToken}` },
      id: res.body.user.id as string,
    };
  };
  const eventsOf = async (userId: string) => {
    const key = await db.query.customerKeys.findFirst({
      where: eq(customerKeys.userId, userId),
    });
    if (!key) return [];
    const rows = await db
      .select()
      .from(eventOutbox)
      .where(eq(eventOutbox.customerKey, key.customerKey));
    return rows.map((r) => r.eventName).sort();
  };

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<Database>(DB);
  });
  afterAll(() => app.close());

  describe('consents', () => {
    it('stores sign-up choices and gives every account a pseudonym', async () => {
      const { auth, id } = await signUp(ALL);
      const { body } = await http()
        .get('/api/v1/me/consents')
        .set(auth)
        .expect(200);
      expect(body.textVersion).toBe('privacy-2026-11');
      expect(
        Object.fromEntries(
          body.consents.map((c: { purpose: string; granted: boolean }) => [
            c.purpose,
            c.granted,
          ]),
        ),
      ).toEqual(ALL);
      expect(
        await db.query.customerKeys.findFirst({
          where: eq(customerKeys.userId, id),
        }),
      ).toBeDefined();
      expect(await eventsOf(id)).toEqual(['account_created']);
    });

    it('records nothing about users who did not allow analytics', async () => {
      const { auth, id } = await signUp();
      const { body } = await http().get('/api/v1/me/consents').set(auth);
      expect(body.consents.every((c: { granted: boolean }) => !c.granted)).toBe(
        true,
      );
      await http()
        .put('/api/v1/me/preferences')
        .set(auth)
        .send({ pace: 'relaxed' })
        .expect(200);
      expect(await eventsOf(id)).toEqual([]);
    });

    it('keeps an append-only history and only records changes', async () => {
      const { auth, id } = await signUp(ALL);
      const count = async () =>
        (
          await db
            .select()
            .from(userConsents)
            .where(eq(userConsents.userId, id))
        ).length;
      expect(await count()).toBe(4);
      await http()
        .put('/api/v1/me/consents')
        .set(auth)
        .send({ consents: { personalisation: true } })
        .expect(200); // no change
      expect(await count()).toBe(4);
      const off = await http()
        .put('/api/v1/me/consents')
        .set(auth)
        .send({ consents: { personalisation: false }, source: 'settings' })
        .expect(200);
      expect(
        off.body.consents.find(
          (c: { purpose: string }) => c.purpose === 'personalisation',
        ).granted,
      ).toBe(false);
      expect(await count()).toBe(5);
      const history = await db
        .select()
        .from(userConsents)
        .where(
          and(
            eq(userConsents.userId, id),
            eq(userConsents.purpose, 'personalisation'),
          ),
        );
      expect(history.map((h) => h.granted)).toEqual([true, false]);
    });
  });

  describe('preferences', () => {
    it('starts empty, saves partial updates and records onboarding once', async () => {
      const { auth, id } = await signUp(ALL);
      const empty = await http()
        .get('/api/v1/me/preferences')
        .set(auth)
        .expect(200);
      expect(empty.body).toMatchObject({
        budgetLevel: 2,
        pace: null,
        interests: [],
        updatedAt: null,
      });

      await http()
        .put('/api/v1/me/preferences')
        .set(auth)
        .send({
          budgetLevel: 1,
          pace: 'packed',
          interests: ['food', 'art'],
          homeAirport: 'AMS',
        })
        .expect(200);
      const second = await http()
        .put('/api/v1/me/preferences')
        .set(auth)
        .send({ seat: 'aisle' })
        .expect(200);
      expect(second.body).toMatchObject({
        budgetLevel: 1,
        pace: 'packed',
        interests: ['food', 'art'],
        homeAirport: 'AMS',
        seat: 'aisle',
      });
      expect(await eventsOf(id)).toEqual([
        'account_created',
        'onboarding_completed',
      ]);

      await http()
        .put('/api/v1/me/preferences')
        .set(auth)
        .send({ interests: ['karaoke'] })
        .expect(400);
      await http()
        .put('/api/v1/me/preferences')
        .set(auth)
        .send({ homeAirport: 'Schiphol' })
        .expect(400);
    });
  });

  describe('events', () => {
    it('accepts valid app events and rejects unknown or malformed ones', async () => {
      const { auth, id } = await signUp(ALL);
      const now = new Date().toISOString();
      const ok = await http()
        .post('/api/v1/events')
        .set(auth)
        .send({
          app: 'web',
          appVersion: '1.0.0',
          events: [
            {
              name: 'screen_viewed',
              occurredAt: now,
              properties: { screen: 'dashboard' },
            },
          ],
        })
        .expect(202);
      expect(ok.body).toEqual({ accepted: 1, dropped: 0 });
      expect(await eventsOf(id)).toContain('screen_viewed');

      const bad = await http()
        .post('/api/v1/events')
        .set(auth)
        .send({
          app: 'web',
          events: [
            {
              name: 'account_created',
              occurredAt: now,
              properties: { language: 'en' },
            },
            {
              name: 'screen_viewed',
              occurredAt: now,
              properties: { screen: 42 },
            },
          ],
        })
        .expect(400);
      expect(bad.body.code).toBe('INVALID_EVENTS');
      expect(bad.body.details).toHaveLength(2);
    });

    it('drops app events without consent', async () => {
      const { auth } = await signUp({ product_analytics: false });
      const res = await http()
        .post('/api/v1/events')
        .set(auth)
        .send({
          app: 'ios',
          events: [
            {
              name: 'screen_viewed',
              occurredAt: new Date().toISOString(),
              properties: { screen: 'wallet' },
            },
          ],
        })
        .expect(202);
      expect(res.body).toEqual({ accepted: 0, dropped: 1 });
    });

    it('records product events together with the change', async () => {
      const { auth, id } = await signUp(ALL);
      const trip = await http()
        .post('/api/v1/trips')
        .set(auth)
        .send({
          city: 'Rome',
          countryCode: 'IT',
          startDate: '2027-04-01',
          endDate: '2027-04-04',
        })
        .expect(201);
      await http()
        .post('/api/v1/reservations')
        .set(auth)
        .send({
          type: 'museum',
          title: 'Borghese Gallery',
          provider: 'Galleria Borghese',
          startAt: '2027-04-02T10:00',
          ref: 'BG1',
        })
        .expect(201);
      const imported = await http()
        .post('/api/v1/imports')
        .set(auth)
        .attach(
          'file',
          readFileSync(join(__dirname, 'fixtures/hotel-confirmation.pdf')),
          'hotel.pdf',
        )
        .expect(202);
      const r = imported.body.reservations[0];
      await http()
        .patch(`/api/v1/reservations/${r.id}`)
        .set(auth)
        .send({ priceCents: 39000 })
        .expect(200);
      await http()
        .post(`/api/v1/reservations/${r.id}/confirm`)
        .set(auth)
        .expect(200);
      expect(await eventsOf(id)).toEqual([
        'account_created',
        'booking_added_manually',
        'booking_confirmed',
        'booking_field_corrected',
        'booking_imported',
        'trip_created',
      ]);
      const [created] = await db
        .select()
        .from(eventOutbox)
        .where(eq(eventOutbox.eventName, 'trip_created'))
        .orderBy(eventOutbox.occurredAt);
      expect(created.properties).toHaveProperty('country_code');
      expect(JSON.stringify(created)).not.toContain('Data Tester');
      expect(trip.body.city.name).toBe('Rome');
    });
  });

  describe('suggestion feedback', () => {
    let demo: { Authorization: string };
    let romeId: string;

    beforeAll(async () => {
      const res = await http()
        .post('/api/v1/auth/login')
        .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
        .expect(200);
      demo = { Authorization: `Bearer ${res.body.accessToken}` };
      romeId = (
        await http()
          .get('/api/v1/trips?when=upcoming&today=2026-10-30')
          .set(demo)
      ).body[0].id;
    });

    it('"not for me" removes a place from future suggestions', async () => {
      const before = await http()
        .get(`/api/v1/trips/${romeId}/suggestions?today=2026-10-30`)
        .set(demo)
        .expect(200);
      const item = before.body.sections.find((s: { id: string }) =>
        s.id.startsWith('free-'),
      ).items[0];
      const fb = await http()
        .post(`/api/v1/trips/${romeId}/suggestions/feedback`)
        .set(demo)
        .send({
          itemRef: item.id,
          action: 'not_for_me',
          section: 'free',
          rankPosition: 0,
        })
        .expect(201);
      expect(fb.body.stored).toBe(true);
      const after = await http()
        .get(`/api/v1/trips/${romeId}/suggestions?today=2026-10-30`)
        .set(demo);
      const ids = after.body.sections.flatMap(
        (s: { items: { id: string }[] }) => s.items.map((i) => i.id),
      );
      expect(ids).not.toContain(item.id);
    });

    it('keeps "shown" only with the personalisation consent', async () => {
      const { auth } = await signUp({
        product_analytics: true,
        personalisation: false,
      });
      const trip = await http()
        .post('/api/v1/trips')
        .set(auth)
        .send({
          city: 'Rome',
          countryCode: 'IT',
          startDate: '2027-05-01',
          endDate: '2027-05-03',
        })
        .expect(201);
      const shown = await http()
        .post(`/api/v1/trips/${trip.body.id}/suggestions/feedback`)
        .set(auth)
        .send({
          itemRef: 'gap-stay-2027-05-01',
          action: 'shown',
          section: 'fix',
        })
        .expect(201);
      expect(shown.body.stored).toBe(false);
      await http()
        .post(`/api/v1/trips/${romeId}/suggestions/feedback`)
        .set(auth)
        .send({ itemRef: 'x', action: 'shown', section: 'fix' })
        .expect(404);
    });
  });

  describe('lake export', () => {
    it('ships outbox events to bronze once and snapshots only consenting users in detail', async () => {
      const lake = app.get(LakeService);
      const quiet = await signUp({ product_analytics: false });
      await http()
        .post('/api/v1/trips')
        .set(quiet.auth)
        .send({
          city: 'Rome',
          countryCode: 'IT',
          startDate: '2027-06-01',
          endDate: '2027-06-02',
        })
        .expect(201);

      const shipped = await lake.shipEvents();
      expect(shipped).toBeGreaterThan(0);
      expect(await lake.shipEvents()).toBe(0);
      const day = new Date().toISOString().slice(0, 10);
      const dir = join(
        process.env.STORAGE_DIR!,
        `lake/bronze/events/ingest_date=${day}`,
      );
      const lines = readdirSync(dir).flatMap((f) =>
        readFileSync(join(dir, f), 'utf8').trim().split('\n'),
      );
      expect(JSON.parse(lines[0])).toHaveProperty('customer_key');

      await lake.snapshot('2099-01-01');
      const read = (t: string) =>
        readFileSync(
          join(
            process.env.STORAGE_DIR!,
            `lake/bronze/snapshots/${t}/snapshot_date=2099-01-01/part-0.jsonl`,
          ),
          'utf8',
        )
          .trim()
          .split('\n')
          .map((l) => JSON.parse(l) as Record<string, unknown>);
      const key = (await db.query.customerKeys.findFirst({
        where: eq(customerKeys.userId, quiet.id),
      }))!.customerKey;
      expect(read('customers').some((c) => c.customer_key === key)).toBe(true);
      expect(read('trips').some((t) => t.customer_key === key)).toBe(false);
      const all = ['customers', 'trips', 'reservations']
        .map((t) => JSON.stringify(read(t)))
        .join('');
      expect(all).not.toMatch(/@|Hotel Test Lisboa|KX7Q2M/);
    });
  });
});
