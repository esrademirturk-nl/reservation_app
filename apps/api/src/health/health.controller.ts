import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { Public } from '../auth/public.decorator';
import { DB, type Database } from '../db/db.module';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    @Inject(DB) private readonly db: Database,
  ) {}

  /** GET /api/v1/health — used by the container platform and uptime checks. */
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => {
        const db = this.indicator.check('database');
        try {
          await this.db.execute(sql`select 1`);
          return db.up();
        } catch (e) {
          return db.down({ message: (e as Error).message });
        }
      },
    ]);
  }
}
