import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB, type Database, type Executor } from '../db/db.module';
import { consentPurposeEnum, userConsents } from '../db/schema';

export type Purpose = (typeof consentPurposeEnum.enumValues)[number];
export const PURPOSES = consentPurposeEnum.enumValues;
/** Bump when the privacy text changes; users are then asked again. */
export const CONSENT_TEXT_VERSION = 'privacy-2026-11';

@Injectable()
export class ConsentsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Current choice per purpose (latest row wins; no row = not granted). */
  async current(userId: string, exec: Executor = this.db) {
    const rows = await exec
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .orderBy(desc(userConsents.recordedAt), desc(userConsents.id));
    return PURPOSES.map((purpose) => {
      const latest = rows.find((r) => r.purpose === purpose);
      return {
        purpose,
        granted: latest?.granted ?? false,
        textVersion: latest?.textVersion ?? null,
        recordedAt: latest?.recordedAt ?? null,
        /** asked again when the privacy text changed */
        needsReview: !!latest && latest.textVersion !== CONSENT_TEXT_VERSION,
      };
    });
  }

  async has(userId: string, purpose: Purpose, exec: Executor = this.db) {
    const [latest] = await exec
      .select({ granted: userConsents.granted })
      .from(userConsents)
      .where(
        and(eq(userConsents.userId, userId), eq(userConsents.purpose, purpose)),
      )
      .orderBy(desc(userConsents.recordedAt), desc(userConsents.id))
      .limit(1);
    return latest?.granted ?? false;
  }

  /** Records only what changed (or what is confirmed under a new text version). Never updates or deletes rows. */
  async set(
    userId: string,
    choices: Partial<Record<Purpose, boolean>>,
    source: string,
    exec: Executor = this.db,
  ) {
    const now = await this.current(userId, exec);
    const changes = now.filter(
      (c) =>
        choices[c.purpose] !== undefined &&
        (c.granted !== choices[c.purpose] ||
          c.textVersion !== CONSENT_TEXT_VERSION),
    );
    if (changes.length)
      await exec.insert(userConsents).values(
        changes.map((c) => ({
          userId,
          purpose: c.purpose,
          granted: choices[c.purpose]!,
          textVersion: CONSENT_TEXT_VERSION,
          source,
        })),
      );
    return this.current(userId, exec);
  }
}
