import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { runMigrations } from '../src/db/migrate';
import { seed } from '../src/db/seed/seed';
import { setupApp } from '../src/setup-app';

describe('API foundation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await runMigrations();
    await seed();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = setupApp(moduleRef.createNestApplication<INestApplication<App>>());
    await app.init();
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
    await request(app.getHttpServer()).get('/health').expect(404);
  });

  it('seeding twice leaves exactly one demo story', async () => {
    const counts = await seed();
    expect(counts).toEqual({ users: 1, trips: 5, reservations: 21 });
  });
});
