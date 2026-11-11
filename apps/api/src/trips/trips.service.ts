import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { and, asc, eq, ilike, inArray, isNull } from 'drizzle-orm';
import { addDays, daysBetween, todayIso } from '../common/dates';
import { EventsService } from '../customer/events.service';
import { DB, type Database } from '../db/db.module';
import {
  cities,
  dayPlans,
  planItems,
  reservations,
  tripMembers,
  trips,
} from '../db/schema';
import { planItemColumns, toPlanItem } from './plan';
import type { CreateTripDto, UpdateTripDto } from './dto';
import { deadlines, gaps, nights, readiness, timeline } from './planning';
import { planTrip, toReservation, toTrip } from './serialize';

export type TripRole = 'owner' | 'editor' | 'viewer';
const NOT_FOUND = { code: 'TRIP_NOT_FOUND', message: 'Trip not found' };

export const slugify = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'trip';

@Injectable()
export class TripsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  /** All trips the user is a member of, with their city. */
  private memberTrips(userId: string) {
    return this.db
      .select({ trip: trips, city: cities, role: tripMembers.role })
      .from(tripMembers)
      .innerJoin(trips, eq(trips.id, tripMembers.tripId))
      .innerJoin(cities, eq(cities.id, trips.cityId))
      .where(and(eq(tripMembers.userId, userId), isNull(trips.deletedAt)))
      .orderBy(asc(trips.startDate));
  }

  /**
   * Loads a trip the user can access. Trips of other users answer 404, not 403,
   * so the API does not reveal that they exist.
   */
  async access(
    tripId: string,
    userId: string,
    need: 'read' | 'write' | 'owner' = 'read',
  ) {
    const [row] = await this.db
      .select({ trip: trips, city: cities, role: tripMembers.role })
      .from(tripMembers)
      .innerJoin(trips, eq(trips.id, tripMembers.tripId))
      .innerJoin(cities, eq(cities.id, trips.cityId))
      .where(
        and(
          eq(tripMembers.userId, userId),
          eq(trips.id, tripId),
          isNull(trips.deletedAt),
        ),
      );
    if (!row) throw new NotFoundException(NOT_FOUND);
    const ok =
      need === 'read' ||
      (need === 'write' ? row.role !== 'viewer' : row.role === 'owner');
    if (!ok)
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You can view this trip but not change it',
      });
    return row;
  }

  private reservationsOf(tripIds: string[]) {
    if (!tripIds.length) return Promise.resolve([]);
    return this.db
      .select()
      .from(reservations)
      .where(
        and(
          inArray(reservations.tripId, tripIds),
          isNull(reservations.deletedAt),
        ),
      )
      .orderBy(asc(reservations.startAt))
      .then((rows) => rows.map(toReservation));
  }

  private summary(
    row: Awaited<ReturnType<TripsService['access']>>,
    rs: ReturnType<typeof toReservation>[],
  ) {
    const active = rs.filter((r) => r.status !== 'cancelled');
    return {
      ...toTrip(row.trip, row.city, row.role),
      nights: nights(planTrip(row.trip, row.city)),
      readiness: readiness(planTrip(row.trip, row.city), rs),
      reservationCount: active.length,
      needsReviewCount: active.filter((r) => r.status === 'pending').length,
      totalCents: active.reduce((n, r) => n + r.priceCents, 0),
    };
  }

  async list(
    userId: string,
    when: 'upcoming' | 'past' | 'all' = 'all',
    today = todayIso(),
  ) {
    const rows = (await this.memberTrips(userId)).filter((r) =>
      when === 'all'
        ? true
        : when === 'upcoming'
          ? r.trip.endDate >= today
          : r.trip.endDate < today,
    );
    if (when === 'past') rows.reverse();
    const rs = await this.reservationsOf(rows.map((r) => r.trip.id));
    return rows.map((row) =>
      this.summary(
        row,
        rs.filter((r) => r.tripId === row.trip.id),
      ),
    );
  }

  /** Stops the user planned (not bookings), ordered by day and time. */
  async planItemsOf(tripId: string) {
    const rows = await this.db
      .select(planItemColumns)
      .from(planItems)
      .innerJoin(dayPlans, eq(dayPlans.id, planItems.dayPlanId))
      .where(eq(dayPlans.tripId, tripId))
      .orderBy(
        asc(dayPlans.date),
        asc(planItems.startTime),
        asc(planItems.position),
      );
    return rows.map(toPlanItem);
  }

  async detail(tripId: string, userId: string, today = todayIso()) {
    const row = await this.access(tripId, userId);
    const rs = await this.reservationsOf([tripId]);
    const planned = await this.planItemsOf(tripId);
    const plan = planTrip(row.trip, row.city);
    // the day plan: bookings (hotels twice) and planned stops, in time order; stops without a time go last
    const events = [
      ...timeline(rs).map((e) => ({
        at: e.at,
        kind: 'booking' as const,
        label: e.label,
        title: e.reservation.title,
        reservationId: e.reservation.id,
      })),
      ...planned.map((p) => ({
        at: `${p.date}T${p.startTime ?? '23:59'}`,
        kind: 'planned' as const,
        label: '',
        title: p.title,
        planItemId: p.id,
        placeId: p.placeId,
      })),
    ].sort((x, y) => x.at.localeCompare(y.at));
    const days = Array.from({ length: nights(plan) + 1 }, (_, i) =>
      addDays(plan.startDate, i),
    ).map((date) => ({
      date,
      events: events.filter((e) => e.at.startsWith(date)),
    }));
    return {
      ...this.summary(row, rs),
      gaps: gaps(plan, rs),
      deadlines: deadlines(rs, today),
      days,
      reservations: rs,
      planned,
    };
  }

  private async findOrCreateCity(dto: CreateTripDto) {
    const code = dto.countryCode.toUpperCase();
    const existing = await this.db.query.cities.findFirst({
      where: and(
        ilike(cities.name, dto.city.trim()),
        eq(cities.countryCode, code),
      ),
    });
    if (existing) return existing;
    if (dto.lat === undefined || dto.lon === undefined || !dto.country)
      throw new UnprocessableEntityException({
        code: 'CITY_UNKNOWN',
        message: `We don't know ${dto.city} yet — send country, lat and lon to add it`,
      });
    const [city] = await this.db
      .insert(cities)
      .values({
        name: dto.city.trim(),
        countryCode: code,
        country: dto.country,
        lat: dto.lat,
        lon: dto.lon,
      })
      .returning();
    return city;
  }

  private checkDates(start: string, end: string) {
    if (end < start)
      throw new BadRequestException({
        code: 'INVALID_DATES',
        message: 'The trip cannot end before it starts',
      });
  }

  async create(userId: string, dto: CreateTripDto) {
    this.checkDates(dto.startDate, dto.endDate);
    const city = await this.findOrCreateCity(dto);
    const taken = new Set(
      (await this.memberTrips(userId)).map((r) => r.trip.slug),
    );
    const base = slugify(city.name);
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;

    const tripId = await this.db.transaction(async (tx) => {
      const [trip] = await tx
        .insert(trips)
        .values({
          slug,
          cityId: city.id,
          startDate: dto.startDate,
          endDate: dto.endDate,
          travelers: dto.travelers ?? 1,
          coverPhotoUrl: dto.coverPhotoUrl,
          coverPhotoCredit: dto.coverPhotoCredit,
        })
        .returning();
      await tx
        .insert(tripMembers)
        .values({ tripId: trip.id, userId, role: 'owner' });
      await this.events.track(tx, userId, 'trip_created', {
        city: city.name,
        country_code: city.countryCode,
        nights: daysBetween(dto.startDate, dto.endDate),
        travelers: trip.travelers,
        days_until_start: daysBetween(todayIso(), dto.startDate),
      });
      return trip.id;
    });
    return this.detail(tripId, userId);
  }

  async update(tripId: string, userId: string, dto: UpdateTripDto) {
    const { trip } = await this.access(tripId, userId, 'write');
    this.checkDates(
      dto.startDate ?? trip.startDate,
      dto.endDate ?? trip.endDate,
    );
    await this.db.update(trips).set(dto).where(eq(trips.id, tripId));
    return this.detail(tripId, userId);
  }

  /** Soft delete. Its reservations go back to Unsorted instead of disappearing. */
  async remove(tripId: string, userId: string) {
    await this.access(tripId, userId, 'owner');
    await this.db.transaction(async (tx) => {
      await tx
        .update(trips)
        .set({ deletedAt: new Date() })
        .where(eq(trips.id, tripId));
      await tx
        .update(reservations)
        .set({ tripId: null })
        .where(eq(reservations.tripId, tripId));
    });
  }

  /** Trips the user can add bookings to (for matching a new booking to a trip). */
  async writableTrips(userId: string) {
    return (await this.memberTrips(userId))
      .filter((r) => r.role !== 'viewer')
      .map((r) => planTrip(r.trip, r.city));
  }
}
