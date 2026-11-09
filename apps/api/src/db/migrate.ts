import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'node:path';

/** Applies the SQL migrations in apps/api/drizzle. Run with `npm run db:migrate`. */
export async function runMigrations(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is not set');
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: path.join(__dirname, '..', '..', 'drizzle'),
    });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => console.log('Migrations applied'))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
