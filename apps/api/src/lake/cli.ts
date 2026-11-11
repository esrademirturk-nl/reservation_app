/**
 * Run lake jobs by hand (no Redis needed):
 *   npm run lake:ship                     ship outbox events to bronze
 *   npm run lake:snapshot [-- YYYY-MM-DD]  daily pseudonymous snapshot
 */
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { validateEnv, type Env } from '../config/env';
import * as schema from '../db/schema';
import { LocalDiskStorage } from '../storage/storage';
import { LakeService } from './lake.service';

async function main() {
  const [command, day] = process.argv.slice(2);
  const env = validateEnv(process.env);
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 2 });
  try {
    const lake = new LakeService(
      drizzle(pool, { schema, casing: 'snake_case' }),
      new LocalDiskStorage(new ConfigService<Env, true>(env)),
    );
    if (command === 'ship')
      console.log(`shipped ${await lake.shipEvents()} events`);
    else if (command === 'snapshot') console.log(await lake.snapshot(day));
    else throw new Error('usage: cli.ts ship | snapshot [YYYY-MM-DD]');
  } finally {
    await pool.end();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
