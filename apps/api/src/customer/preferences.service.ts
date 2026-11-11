import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, type Database } from '../db/db.module';
import { userPreferences, users } from '../db/schema';
import type { UpdatePreferencesDto } from './dto';
import { EventsService } from './events.service';

@Injectable()
export class PreferencesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  async get(userId: string) {
    const [user] = await this.db
      .select({ budgetLevel: users.budgetLevel })
      .from(users)
      .where(eq(users.id, userId));
    const p = await this.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });
    return {
      budgetLevel: user?.budgetLevel ?? 2,
      pace: p?.pace ?? null,
      interests: p?.interests ?? [],
      travelParty: p?.travelParty ?? null,
      homeAirport: p?.homeAirport ?? null,
      preferredProviders: p?.preferredProviders ?? [],
      seat: p?.seat ?? null,
      /** null until the user went through onboarding */
      updatedAt: p?.updatedAt ?? null,
    };
  }

  async update(userId: string, dto: UpdatePreferencesDto) {
    const { budgetLevel, ...prefs } = dto;
    await this.db.transaction(async (tx) => {
      const first = !(await tx.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      }));
      if (budgetLevel !== undefined)
        await tx.update(users).set({ budgetLevel }).where(eq(users.id, userId));
      await tx
        .insert(userPreferences)
        .values({ userId, ...prefs })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { ...prefs, updatedAt: new Date() },
        });
      if (first) {
        const [u] = await tx
          .select({ budgetLevel: users.budgetLevel })
          .from(users)
          .where(eq(users.id, userId));
        await this.events.track(tx, userId, 'onboarding_completed', {
          interests_count: prefs.interests?.length ?? 0,
          pace: prefs.pace ?? null,
          travel_party: prefs.travelParty ?? null,
          budget_level: u.budgetLevel,
        });
      }
    });
    return this.get(userId);
  }
}
