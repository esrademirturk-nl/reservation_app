import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { seed } from '../src/db/seed/seed';
import { createTestApp } from './app';

describe('API foundation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health reports the database as up', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' } },
    });
  });

  it('routes outside /api/v1 are not found', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('seeding twice leaves exactly one demo story', async () => {
    const counts = await seed();
    expect(counts).toEqual({ users: 1, trips: 5, reservations: 21 });
  });
});
