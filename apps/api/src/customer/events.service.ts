import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, type Database, type Executor } from '../db/db.module';
import { customerKeys, eventOutbox } from '../db/schema';
import { CONSENT_TEXT_VERSION, ConsentsService } from './consents.service';
import {
  TRACKING_PLAN,
  type EventName,
  type EventProps,
} from './tracking-plan';

export interface EventContext {
  app?: string;
  appVersion?: string;
  locale?: string;
  sessionId?: string;
}

@Injectable()
export class EventsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly consents: ConsentsService,
  ) {}

  /** The user's pseudonym, created on first use. */
  async customerKey(userId: string, exec: Executor = this.db) {
    const [row] = await exec
      .insert(customerKeys)
      .values({ userId })
      .onConflictDoNothing()
      .returning();
    if (row) return row.customerKey;
    const existing = await exec.query.customerKeys.findFirst({
      where: eq(customerKeys.userId, userId),
    });
    return existing!.customerKey;
  }

  /**
   * Records an event in the outbox — only if the user allowed product analytics.
   * Pass the caller's transaction so the event and the change are saved together (or not at all);
   * `undefined` writes on its own (events that describe no database change).
   */
  async track<N extends EventName>(
    exec: Executor | undefined,
    userId: string,
    name: N,
    properties: EventProps<N>,
    context: EventContext = {},
    occurredAt?: Date,
  ) {
    exec ??= this.db;
    if (!(await this.consents.has(userId, 'product_analytics', exec)))
      return false;
    const plan = TRACKING_PLAN[name];
    const parsed = plan.schema.safeParse(properties);
    if (!parsed.success)
      throw new BadRequestException({
        code: 'INVALID_EVENT',
        message: `Invalid properties for ${name}`,
        details: parsed.error.issues,
      });
    await exec.insert(eventOutbox).values({
      customerKey: await this.customerKey(userId, exec),
      eventName: name,
      schemaVersion: plan.version,
      occurredAt,
      properties: parsed.data as Record<string, unknown>,
      context: {
        app: 'api',
        ...context,
        consent_version: CONSENT_TEXT_VERSION,
      },
    });
    return true;
  }
}
