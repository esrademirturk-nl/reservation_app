import { Inject, Injectable, Logger } from '@nestjs/common';
import { asc, inArray, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { todayIso } from '../common/dates';
import { DB, type Database } from '../db/db.module';
import { eventOutbox } from '../db/schema';
import { Storage } from '../storage/storage';

const BATCH = 5000;
const jsonl = (rows: unknown[]) =>
  Buffer.from(
    rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''),
  );

/**
 * Moves data from the app database to the lakehouse "bronze" layer as JSON Lines files.
 *   lake/bronze/events/ingest_date=YYYY-MM-DD/*.jsonl          ← event outbox (every 15 min)
 *   lake/bronze/snapshots/<table>/snapshot_date=YYYY-MM-DD/     ← pseudonymous daily copies
 * Files go through the Storage class: local disk today, Azure Data Lake (ADLS Gen2) in production.
 * Nothing written here contains a name, email, booking reference or free text.
 */
@Injectable()
export class LakeService {
  private readonly log = new Logger(LakeService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly storage: Storage,
  ) {}

  /** Ships unshipped outbox events in batches. Safe to run in parallel (rows are locked and skipped). */
  async shipEvents(now = new Date()) {
    let total = 0;
    for (;;) {
      const shipped = await this.db.transaction(async (tx) => {
        const rows = await tx
          .select()
          .from(eventOutbox)
          .where(isNull(eventOutbox.shippedAt))
          .orderBy(asc(eventOutbox.occurredAt))
          .limit(BATCH)
          .for('update', { skipLocked: true });
        if (!rows.length) return 0;
        const day = now.toISOString().slice(0, 10);
        await this.storage.put(
          `lake/bronze/events/ingest_date=${day}/events-${now.getTime()}-${randomUUID().slice(0, 8)}.jsonl`,
          jsonl(
            rows.map((r) => ({
              event_id: r.eventId,
              customer_key: r.customerKey,
              event_name: r.eventName,
              schema_version: r.schemaVersion,
              occurred_at: r.occurredAt.toISOString(),
              properties: r.properties,
              context: r.context,
              ingested_at: now.toISOString(),
            })),
          ),
        );
        await tx
          .update(eventOutbox)
          .set({ shippedAt: now })
          .where(
            inArray(
              eventOutbox.eventId,
              rows.map((r) => r.eventId),
            ),
          );
        return rows.length;
      });
      total += shipped;
      if (shipped < BATCH) break;
    }
    if (total) this.log.log(`Shipped ${total} events to bronze`);
    return total;
  }

  /** Daily pseudonymous snapshot of the business tables. Details only for users who allowed product analytics. */
  async snapshot(day = todayIso()) {
    // every user gets a pseudonym before anything is exported
    await this.db.execute(
      sql`insert into customer_keys (user_id) select id from users on conflict do nothing`,
    );

    const q = async (name: string, query: ReturnType<typeof sql>) => {
      // timestamps as UTC text, so files do not depend on the server's time zone
      const rows = await this.db.transaction(async (tx) => {
        await tx.execute(sql`set local time zone 'UTC'`);
        return (await tx.execute(query)).rows;
      });
      await this.storage.put(
        `lake/bronze/snapshots/${name}/snapshot_date=${day}/part-0.jsonl`,
        jsonl(rows),
      );
      return [name, rows.length] as const;
    };
    // current consent per user and purpose
    const consenting = sql`(select k.user_id from customer_keys k
        join lateral (select granted from user_consents c where c.user_id = k.user_id and c.purpose = 'product_analytics'
                      order by recorded_at desc, id desc limit 1) pa on pa.granted)`;

    const counts = Object.fromEntries([
      await q(
        'customers',
        sql`
        select k.customer_key, u.language, u.budget_level, u.home_city, u.created_at::date as signup_date,
               (u.deleted_at is not null) as is_deleted
        from users u join customer_keys k on k.user_id = u.id`,
      ),
      await q(
        'consents',
        sql`
        select k.customer_key, c.purpose, c.granted, c.text_version, c.source, c.recorded_at
        from user_consents c join customer_keys k on k.user_id = c.user_id`,
      ),
      await q(
        'preferences',
        sql`
        select k.customer_key, p.pace, p.interests, p.travel_party, p.home_airport, p.preferred_providers, p.seat, p.updated_at
        from user_preferences p join customer_keys k on k.user_id = p.user_id
        where p.user_id in ${consenting}`,
      ),
      await q(
        'trips',
        sql`
        select t.id as trip_id, k.customer_key, ci.name as city, ci.country_code, t.start_date, t.end_date, t.travelers,
               t.created_at, (t.deleted_at is not null) as is_deleted
        from trips t
        join trip_members m on m.trip_id = t.id and m.role = 'owner'
        join customer_keys k on k.user_id = m.user_id
        join cities ci on ci.id = t.city_id
        where m.user_id in ${consenting}`,
      ),
      await q(
        'reservations',
        sql`
        select r.id as reservation_id, r.trip_id, k.customer_key, r.type, r.provider, r.source, r.status,
               r.start_at, r.end_at, r.price_cents, r.currency, r.guests, r.created_at,
               coalesce((select count(*) from jsonb_object_keys(r.field_confidence)), 0)::int as fields_flagged,
               (r.deleted_at is not null) as is_deleted
        from reservations r join customer_keys k on k.user_id = r.user_id
        where r.user_id in ${consenting}`,
      ),
      await q(
        'suggestion_feedback',
        sql`
        select k.customer_key, f.trip_id, f.item_ref, f.action, f.at
        from suggestion_feedback f join customer_keys k on k.user_id = f.user_id
        where f.user_id in ${consenting}`,
      ),
      await q(
        'places',
        sql`
        select p.id as place_id, ci.name as city, p.category, p.rank, p.price_level, p.visit_minutes
        from places p join cities ci on ci.id = p.city_id`,
      ),
    ]);
    this.log.log(`Snapshot ${day}: ${JSON.stringify(counts)}`);
    return counts;
  }
}
