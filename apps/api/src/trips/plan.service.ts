import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DB, type Database } from '../db/db.module';
import { dayPlans, places, planItems } from '../db/schema';
import type { AddPlanItemDto, UpdatePlanItemDto } from './dto';
import { planItemColumns, toPlanItem } from './plan';
import { TripsService } from './trips.service';

const NOT_FOUND = {
  code: 'PLAN_ITEM_NOT_FOUND',
  message: 'Plan item not found',
};

/** The user's own stops in the day plan ("Add to Day 2", "Trevi Fountain at 17:30"). */
@Injectable()
export class PlanService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly trips: TripsService,
  ) {}

  list(tripId: string, userId: string) {
    return this.trips
      .access(tripId, userId)
      .then(() => this.trips.planItemsOf(tripId));
  }

  async add(tripId: string, userId: string, dto: AddPlanItemDto) {
    const { trip } = await this.trips.access(tripId, userId, 'write');
    if (dto.date < trip.startDate || dto.date > trip.endDate)
      throw new BadRequestException({
        code: 'DATE_OUTSIDE_TRIP',
        message: 'Pick a day within the trip',
      });
    let title = dto.title;
    if (dto.placeId) {
      const place = await this.db.query.places.findFirst({
        where: and(eq(places.id, dto.placeId), eq(places.cityId, trip.cityId)),
      });
      if (!place)
        throw new BadRequestException({
          code: 'PLACE_NOT_IN_CITY',
          message: 'This place is not in the trip’s city',
        });
      title ??= place.name;
    }
    if (!title)
      throw new BadRequestException({
        code: 'TITLE_REQUIRED',
        message: 'Give the stop a title or pick a place',
      });

    const [day] = await this.db
      .insert(dayPlans)
      .values({ tripId, date: dto.date })
      .onConflictDoUpdate({
        target: [dayPlans.tripId, dayPlans.date],
        set: { date: dto.date },
      })
      .returning();
    const [{ next }] = await this.db
      .select({
        next: sql<number>`coalesce(max(${planItems.position}) + 1, 0)`,
      })
      .from(planItems)
      .where(eq(planItems.dayPlanId, day.id));
    const [item] = await this.db
      .insert(planItems)
      .values({
        dayPlanId: day.id,
        kind: 'planned',
        placeId: dto.placeId,
        title,
        subtitle: dto.subtitle,
        startTime: dto.startTime,
        endTime: dto.endTime,
        position: Number(next),
      })
      .returning();
    return toPlanItem({ ...item, date: day.date });
  }

  private async load(tripId: string, itemId: string, userId: string) {
    await this.trips.access(tripId, userId, 'write');
    const [row] = await this.db
      .select(planItemColumns)
      .from(planItems)
      .innerJoin(dayPlans, eq(dayPlans.id, planItems.dayPlanId))
      .where(and(eq(planItems.id, itemId), eq(dayPlans.tripId, tripId)));
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async update(
    tripId: string,
    itemId: string,
    userId: string,
    dto: UpdatePlanItemDto,
  ) {
    const row = await this.load(tripId, itemId, userId);
    const [item] = await this.db
      .update(planItems)
      .set(dto)
      .where(eq(planItems.id, itemId))
      .returning();
    return toPlanItem({ ...item, date: row.date });
  }

  async remove(tripId: string, itemId: string, userId: string) {
    await this.load(tripId, itemId, userId);
    await this.db.delete(planItems).where(eq(planItems.id, itemId));
  }
}
