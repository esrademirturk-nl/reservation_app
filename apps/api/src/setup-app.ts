import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './config/env';

/** Shared by main.ts and the e2e tests, so tests run the app exactly as production does. */
export function setupApp<T extends INestApplication>(app: T): T {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((o) => o.trim()),
  });
  app.enableShutdownHooks();
  return app;
}
