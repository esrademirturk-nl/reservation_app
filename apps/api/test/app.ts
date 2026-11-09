import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { runMigrations } from '../src/db/migrate';
import { seed } from '../src/db/seed/seed';
import { setupApp } from '../src/setup-app';

/** Fresh Nest app on the test database, migrated and seeded. */
export async function createTestApp() {
  await runMigrations();
  await seed();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = setupApp(
    moduleRef.createNestApplication<INestApplication<App>>({ rawBody: true }),
  );
  await app.init();
  return app;
}

/** A unique email per test run so tests never collide. */
export const uniqueEmail = (tag: string) =>
  `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.waypad.app`;
