import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { DB, type Database } from '../src/db/db.module';
import { inboundEmails } from '../src/db/schema';
import { signInbound } from '../src/imports/inbound.controller';
import { ImportsService } from '../src/imports/imports.service';
import { createTestApp, uniqueEmail } from './app';

const SECRET = process.env.INBOUND_SECRET!;
const KLM_EMAIL = [
  'Your KLM booking is confirmed',
  'Booking reference: QA7LIS',
  'Passengers: 2 adults',
  'Outbound flight KL1691 AMS → LIS',
  'Departure: Fri 5 Mar 2027 07:20 Amsterdam Schiphol',
  'Arrival: Fri 5 Mar 2027 09:15 Lisbon',
  'Return flight KL1692 LIS → AMS',
  'Departure: Mon 8 Mar 2027 10:05 Lisbon',
  'Arrival: Mon 8 Mar 2027 14:00 Amsterdam Schiphol',
  'Total price: € 312,00',
].join('\n');

describe('Booking import (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let auth: { Authorization: string };
  let user: { email: string; forwardAddress: string };
  let tripId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const res = await http()
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('imp'),
        password: 'secret-pass1',
        fullName: 'Import Tester',
      })
      .expect(201);
    auth = { Authorization: `Bearer ${res.body.accessToken}` };
    user = res.body.user;
    const trip = await http()
      .post('/api/v1/trips')
      .set(auth)
      .send({
        city: 'Lisbon',
        countryCode: 'PT',
        country: 'Portugal',
        lat: 38.72,
        lon: -9.14,
        startDate: '2027-03-05',
        endDate: '2027-03-08',
      })
      .expect(201);
    tripId = trip.body.id;
  });
  afterAll(() => app.close());

  describe('upload', () => {
    it('reads a PDF hotel confirmation into a reservation waiting for review', async () => {
      const res = await http()
        .post('/api/v1/imports')
        .set(auth)
        .attach(
          'file',
          readFileSync(join(__dirname, 'fixtures/hotel-confirmation.pdf')),
          'hotel-confirmation.pdf',
        )
        .expect(202);
      expect(res.body).toMatchObject({
        status: 'parsed',
        mimeType: 'application/pdf',
        fileName: 'hotel-confirmation.pdf',
      });
      expect(res.body.reservations).toHaveLength(1);
      const r = res.body.reservations[0];
      expect(r).toMatchObject({
        type: 'hotel',
        tripId,
        title: 'Hotel Test Lisboa',
        provider: 'Booking.com',
        source: 'pdf',
        status: 'pending',
        ref: '5512.339.870',
        startAt: '2027-03-05T14:00',
        endAt: '2027-03-08T11:00',
        priceCents: 38940,
        freeCancellationUntil: '2027-03-01',
      });

      // the trip now shows one booking to review
      const trip = await http()
        .get(`/api/v1/trips/${tripId}`)
        .set(auth)
        .expect(200);
      expect(trip.body.needsReviewCount).toBe(1);

      // "Looks right" → confirmed, no flags left
      const ok = await http()
        .post(`/api/v1/reservations/${r.id}/confirm`)
        .set(auth)
        .expect(200);
      expect(ok.body).toMatchObject({ status: 'confirmed', needsCheck: [] });
    });

    it('does not add the same booking twice', async () => {
      const res = await http()
        .post('/api/v1/imports')
        .set(auth)
        .attach(
          'file',
          readFileSync(join(__dirname, 'fixtures/hotel-confirmation.pdf')),
          'again.pdf',
        )
        .expect(202);
      expect(res.body.reservations).toHaveLength(0);
    });

    it('marks a file without a booking as failed, with a friendly message', async () => {
      const res = await http()
        .post('/api/v1/imports')
        .set(auth)
        .attach('file', Buffer.from('Lunch on Friday?'), 'note.txt')
        .expect(202);
      expect(res.body).toMatchObject({
        status: 'failed',
        error: "We couldn't find a booking in this file",
      });
    });

    it('rejects files that are not what they claim to be', async () => {
      const res = await http()
        .post('/api/v1/imports')
        .set(auth)
        .attach('file', Buffer.from([0x4d, 0x5a, 0x00, 0x01, 0x02]), {
          filename: 'ticket.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
      expect(res.body.code).toBe('UNSUPPORTED_FILE');
      await http().post('/api/v1/imports').set(auth).expect(400);
    });

    it('lists imports and hides them from other users', async () => {
      const list = await http().get('/api/v1/imports').set(auth).expect(200);
      expect(list.body.length).toBeGreaterThanOrEqual(3);
      const other = await http()
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail('imp2'),
          password: 'secret-pass1',
          fullName: 'Other',
        })
        .expect(201);
      await http()
        .get(`/api/v1/imports/${list.body[0].id}`)
        .set('Authorization', `Bearer ${other.body.accessToken}`)
        .expect(404);
    });
  });

  describe('forwarded email webhook', () => {
    const post = (payload: object, secret = SECRET) => {
      const body = JSON.stringify(payload);
      return http()
        .post('/api/v1/inbound/email')
        .set('Content-Type', 'application/json')
        .set('X-Waypad-Signature', signInbound(secret, body))
        .send(body);
    };

    it('refuses unsigned or wrongly signed requests', async () => {
      const payload = {
        to: user.forwardAddress,
        from: user.email,
        text: KLM_EMAIL,
      };
      await http().post('/api/v1/inbound/email').send(payload).expect(401);
      await post(payload, 'wrong-secret-wrong-secret').expect(401);
    });

    it('imports both flights from an email the user forwarded', async () => {
      const res = await post({
        to: `Import <${user.forwardAddress.toUpperCase()}>`,
        from: `Me <${user.email}>`,
        subject: 'Fwd: Your KLM booking',
        text: KLM_EMAIL,
      }).expect(202);
      expect(res.body.status).toBe('accepted');
      const flights = await http()
        .get(`/api/v1/reservations?tripId=${tripId}&status=pending`)
        .set(auth)
        .expect(200);
      expect(
        flights.body.map((f: { title: string; source: string }) => [
          f.title,
          f.source,
        ]),
      ).toEqual([
        ['KLM · AMS → LIS', 'email'],
        ['KLM · LIS → AMS', 'email'],
      ]);
      const trip = await http().get(`/api/v1/trips/${tripId}`).set(auth);
      expect(trip.body.readiness.checks).toMatchObject({
        outbound: true,
        stay: true,
        return: true,
      });
    });

    it('ignores mail from strangers and to unknown addresses', async () => {
      const stranger = await post({
        to: user.forwardAddress,
        from: 'someone@example.com',
        text: KLM_EMAIL,
      }).expect(202);
      expect(stranger.body.status).toBe('rejected_sender');
      const unknown = await post({
        to: 'nobody-here@in.waypad.app',
        from: user.email,
        text: KLM_EMAIL,
      }).expect(202);
      expect(unknown.body.status).toBe('ignored');
    });

    it('reads a PDF attached to the email', async () => {
      const pdf = readFileSync(
        join(__dirname, 'fixtures/hotel-confirmation.pdf'),
      ).toString('base64');
      const res = await post({
        to: user.forwardAddress,
        from: user.email,
        subject: 'Fwd: hotel',
        text: 'See attachment',
        attachments: [
          {
            filename: 'hotel.pdf',
            contentType: 'application/pdf',
            content: pdf,
          },
        ],
      }).expect(202);
      expect(res.body.documents).toHaveLength(2);
      const doc = await http()
        .get(`/api/v1/imports/${res.body.documents[1]}`)
        .set(auth)
        .expect(200);
      expect(doc.body).toMatchObject({
        kind: 'email_attachment',
        status: 'parsed',
      });
    });

    it('purges raw emails after 30 days', async () => {
      const imports = app.get(ImportsService);
      const db = app.get<Database>(DB);
      const purged = await imports.purgeExpired(
        new Date(Date.now() + 31 * 86_400_000),
      );
      expect(purged).toBeGreaterThan(0);
      const left = await db.query.inboundEmails.findMany({
        where: (e, { eq, and, ne }) =>
          and(eq(e.fromAddress, user.email), ne(e.rawBlobPath, '')),
      });
      expect(left).toHaveLength(0);
      expect(inboundEmails).toBeDefined();
    });
  });
});
