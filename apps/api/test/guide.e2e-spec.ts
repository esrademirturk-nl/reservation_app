import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../src/db/seed/seed';
import { createTestApp } from './app';

describe('City guide & suggestions (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let auth: { Authorization: string };
  let rome: { id: string; city: { id: number }; startDate: string };

  beforeAll(async () => {
    app = await createTestApp(); // re-seeds the demo, so the Rome plan is fresh
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .expect(200);
    auth = { Authorization: `Bearer ${res.body.accessToken}` };
    const trips = await http()
      .get('/api/v1/trips?when=upcoming&today=2026-10-30')
      .set(auth);
    rome = trips.body[0];
  });
  afterAll(() => app.close());

  it('lists places near me, nearest first, with walking time', async () => {
    const { body } = await http()
      .get(`/api/v1/cities/${rome.city.id}/places?lat=41.8902&lon=12.4922`)
      .set(auth)
      .expect(200);
    expect(body[0]).toMatchObject({
      slug: 'colosseum',
      distanceM: 0,
      walkMinutes: 1,
    });
    expect(body[1].slug).toBe('arch');
    const food = await http()
      .get(`/api/v1/cities/${rome.city.id}/places?category=coffee`)
      .set(auth)
      .expect(200);
    expect(food.body.map((p: { slug: string }) => p.slug)).toEqual([
      'sant-eustachio',
    ]);
  });

  it('serves the audio guide in the chosen language, falling back to English', async () => {
    const list = await http()
      .get(`/api/v1/cities/${rome.city.id}/places`)
      .set(auth);
    const id = (slug: string) =>
      list.body.find((p: { slug: string }) => p.slug === slug).id;

    const nl = await http()
      .get(`/api/v1/places/${id('colosseum')}?lang=nl`)
      .set(auth)
      .expect(200);
    expect(nl.body.audioGuide).toMatchObject({
      language: 'nl',
      fallback: false,
      source: 'curated',
      seconds: 105,
    });
    expect(nl.body.nearby[0].name).toBe('Arch of Constantine');

    const trevi = await http()
      .get(`/api/v1/places/${id('trevi')}?lang=nl`)
      .set(auth)
      .expect(200);
    expect(trevi.body.audioGuide).toMatchObject({
      language: 'en',
      requestedLanguage: 'nl',
      fallback: true,
    });
    expect(trevi.body.availableLanguages.sort()).toEqual(['en', 'tr']);

    const none = await http()
      .get(`/api/v1/places/${id('vatican')}`)
      .set(auth)
      .expect(200);
    expect(none.body.audioGuide).toBeNull();
  });

  it('says when a city has no live guide', async () => {
    const t = await http()
      .post('/api/v1/trips')
      .set(auth)
      .send({
        city: `Quietville ${Date.now()}`,
        countryCode: 'NL',
        country: 'Netherlands',
        lat: 52,
        lon: 5,
        startDate: '2027-05-01',
        endDate: '2027-05-02',
      })
      .expect(201);
    const res = await http()
      .get(`/api/v1/cities/${t.body.city.id}/places`)
      .set(auth)
      .expect(404);
    expect(res.body.code).toBe('GUIDE_UNAVAILABLE');
    await http().delete(`/api/v1/trips/${t.body.id}`).set(auth).expect(204);
  });

  it('shows the demo Rome day plan with bookings and planned stops', async () => {
    const { body } = await http()
      .get(`/api/v1/trips/${rome.id}?today=2026-10-30`)
      .set(auth)
      .expect(200);
    const day2 = body.days[1].events.map(
      (e: { at: string; kind: string; title: string }) =>
        `${e.at.slice(11)} ${e.kind} ${e.title}`,
    );
    expect(day2).toEqual(
      expect.arrayContaining([
        '09:00 planned Breakfast at hotel',
        '17:30 planned Trevi Fountain',
      ]),
    );
    expect(body.planned).toHaveLength(7);
  });

  it('suggests how to fix the trip, fill free time and what not to miss', async () => {
    const { body } = await http()
      .get(`/api/v1/trips/${rome.id}/suggestions?today=2026-10-30`)
      .set(auth)
      .expect(200);
    const fix = body.sections.find((s: { id: string }) => s.id === 'fix');
    expect(fix.items[0]).toMatchObject({
      title: 'Hotel missing for 15 Nov',
      action: { type: 'link', label: 'Search hotels' },
    });
    expect(fix.items[0].action.url).toContain('checkin=2026-11-15');

    const free = body.sections.filter((s: { id: string }) =>
      s.id.startsWith('free-'),
    );
    expect(free.length).toBeGreaterThan(0);
    expect(free[0].items[0].action).toMatchObject({ type: 'add_to_plan' });

    // nothing already booked or planned is suggested again
    const titles = body.sections.flatMap((s: { items: { title: string }[] }) =>
      s.items.map((i) => i.title),
    );
    expect(titles).not.toContain('Colosseum');
    expect(titles).not.toContain('Trevi Fountain');
  });

  it('adds a suggestion to the plan and removes it again', async () => {
    const s = await http()
      .get(`/api/v1/trips/${rome.id}/suggestions?today=2026-10-30`)
      .set(auth);
    const item = s.body.sections.find((x: { id: string }) =>
      x.id.startsWith('free-'),
    ).items[0];
    const added = await http()
      .post(`/api/v1/trips/${rome.id}/plan`)
      .set(auth)
      .send({
        date: item.action.date,
        startTime: item.action.startTime,
        placeId: item.action.placeId,
      })
      .expect(201);
    expect(added.body).toMatchObject({
      title: item.title,
      kind: 'planned',
      placeId: item.action.placeId,
    });

    const again = await http()
      .get(`/api/v1/trips/${rome.id}/suggestions?today=2026-10-30`)
      .set(auth);
    const titles = again.body.sections.flatMap(
      (x: { items: { title: string }[] }) => x.items.map((i) => i.title),
    );
    expect(titles).not.toContain(item.title);

    await http()
      .patch(`/api/v1/trips/${rome.id}/plan/${added.body.id}`)
      .set(auth)
      .send({ startTime: '14:15' })
      .expect(200);
    await http()
      .delete(`/api/v1/trips/${rome.id}/plan/${added.body.id}`)
      .set(auth)
      .expect(204);
    await http()
      .delete(`/api/v1/trips/${rome.id}/plan/${added.body.id}`)
      .set(auth)
      .expect(404);
  });

  it('validates plan items', async () => {
    const out = await http()
      .post(`/api/v1/trips/${rome.id}/plan`)
      .set(auth)
      .send({ date: '2026-12-01', title: 'x' })
      .expect(400);
    expect(out.body.code).toBe('DATE_OUTSIDE_TRIP');
    const noTitle = await http()
      .post(`/api/v1/trips/${rome.id}/plan`)
      .set(auth)
      .send({ date: '2026-11-13' })
      .expect(400);
    expect(noTitle.body.code).toBe('TITLE_REQUIRED');
    await http()
      .post(`/api/v1/trips/${rome.id}/plan`)
      .set(auth)
      .send({ date: '2026-11-13', title: 'x', startTime: '25:00' })
      .expect(400);
  });
});
