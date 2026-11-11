import { Inject, Injectable } from '@nestjs/common';
import { ConsentsService } from '../customer/consents.service';
import { EventsService } from '../customer/events.service';
import type { SuggestionFeedbackDto } from '../customer/dto';
import { DB, type Database } from '../db/db.module';
import { suggestionFeedback } from '../db/schema';
import { TripsService } from '../trips/trips.service';

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly trips: TripsService,
    private readonly consents: ConsentsService,
    private readonly events: EventsService,
  ) {}

  /**
   * "Dismissed" and "not for me" are instructions from the user, so they are always kept.
   * "Shown" and "accepted" are learning signals, kept only with the personalisation consent.
   */
  async record(tripId: string, userId: string, dto: SuggestionFeedbackDto) {
    await this.trips.access(tripId, userId);
    const instruction =
      dto.action === 'dismissed' || dto.action === 'not_for_me';
    return this.db.transaction(async (tx) => {
      const stored =
        instruction || (await this.consents.has(userId, 'personalisation', tx));
      if (stored)
        await tx
          .insert(suggestionFeedback)
          .values({ userId, tripId, itemRef: dto.itemRef, action: dto.action });
      await this.events.track(tx, userId, 'suggestion_feedback', {
        action: dto.action,
        section: dto.section,
        item_kind: dto.itemRef.startsWith('gap-') ? 'gap' : 'place',
        rank_position: dto.rankPosition,
      });
      return { stored };
    });
  }
}
