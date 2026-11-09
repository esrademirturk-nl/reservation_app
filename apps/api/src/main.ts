import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';
import type { Env } from './config/env';

async function bootstrap() {
  const app = setupApp(await NestFactory.create(AppModule));
  const port = app
    .get<ConfigService<Env, true>>(ConfigService)
    .get('PORT', { infer: true });
  await app.listen(port);
  console.log(`Waypad API listening on http://localhost:${port}/api/v1`);
}
void bootstrap();
