import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, or, type SQL } from 'drizzle-orm';
import { toPgDateTime } from '../common/dates';
import { DB, type Database } from '../db/db.module';
import { reservations, tripMembers } from '../db/schema';
import { matchTrip } from '../trips/planning';
import { toReservation } from '../trips/serialize';
import { TripsService } from '../trips/trips.service';
import type {
  CreateReservationDto,
  ListReservationsQuery,
  UpdateReservationDto,
} from './dto';

const NOT_FOUND = {
  code: 'RESERVATION_NOT_FOUND',
  message: 'Reservation not found',
};
type Row = typeof reservations.$inferSelect;

@Injectable()
export class ReservationsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly trips: TripsService,
  ) {}

  /** Reservations the user can see: their own, plus those in trips they are a member of. */
  private visible(userId: string): SQL {
    const memberTrips = this.db
      .select({ id: tripMembers.tripId })
      .from(tripMembers)
      .where(eq(tripMembers.userId, userId));
    return and(
      isNull(reservations.deletedAt),
      or(
        eq(reservations.userId, userId),
        inArray(reservations.tripId, memberTrips),
      ),
    )!;
  }

  async list(userId: string, q: ListReservationsQuery) {
    const filters: SQL[] = [this.visible(userId)];
    if (q.tripId) {
      await this.trips.access(q.tripId, userId);
      filters.push(eq(reservations.tripId, q.tripId));
    }
    if (q.unsorted)
      filters.push(
        isNull(reservations.tripId),
        eq(reservations.userId, userId),
      );
    if (q.status) filters.push(eq(reservations.status, q.status));
    const rows = await this.db
      .select()
      .from(reservations)
      .where(and(...filters))
      .orderBy(asc(reservations.startAt));
    return rows.map(toReservation);
  }

  /** Newest first — "Recently added" on the dashboard. */
  async recent(userId: string, limit: number) {
    const rows = await this.db
      .select()
      .from(reservations)
      .where(this.visible(userId))
      .orderBy(desc(reservations.createdAt))
      .limit(limit);
    return rows.map(toReservation);
  }

  private async load(id: string, userId: string, need: 'read' | 'write') {
    const [row] = await this.db
      .select()
      .from(reservations)
      .where(and(eq(reservations.id, id), this.visible(userId)));
    if (!row) throw new NotFoundException(NOT_FOUND);
    // a trip member who is only a viewer may read but not change it
    if (need === 'write' && row.userId !== userId && row.tripId)
      await this.trips.access(row.tripId, userId, 'write');
    return row;
  }

  get(id: string, userId: string) {
    return this.load(id, userId, 'read').then(toReservation);
  }

  private checkDates(startAt: string, endAt?: string | null) {
    if (endAt && endAt < startAt)
      throw new BadRequestException({
        code: 'INVALID_DATES',
        message: 'A booking cannot end before it starts',
      });
  }

  /** Manual booking. Without a tripId it joins the trip whose dates contain it, or stays Unsorted. */
  async create(userId: string, dto: CreateReservationDto) {
    this.checkDates(dto.startAt, dto.endAt);
    let tripId: string | null = dto.tripId ?? null;
    if (tripId) await this.trips.access(tripId, userId, 'write');
    else
      tripId =
        matchTrip(await this.trips.writableTrips(userId), dto.startAt)?.id ??
        null;

    const [row] = await this.db
      .insert(reservations)
      .values({
        ...this.columns(dto),
        userId,
        tripId,
        type: dto.type,
        title: dto.title,
        provider: dto.provider,
        ref: dto.ref,
        startAt: toPgDateTime(dto.startAt),
        source: 'manual',
        status: 'confirmed',
      })
      .returning();
    return toReservation(row);
  }

  async update(id: string, userId: string, dto: UpdateReservationDto) {
    const row = await this.load(id, userId, 'write');
    const startAt = dto.startAt ?? row.startAt.replace(' ', 'T').slice(0, 16);
    const endAt =
      dto.endAt === undefined
        ? row.endAt?.replace(' ', 'T').slice(0, 16)
        : dto.endAt;
    this.checkDates(startAt, endAt);
    if (dto.tripId) await this.trips.access(dto.tripId, userId, 'write');

    // a field the user edited is now verified — drop its "Please check" flag
    const confidence = { ...(row.fieldConfidence ?? {}) };
    for (const k of Object.keys(dto)) delete confidence[k];

    const [updated] = await this.db
      .update(reservations)
      .set({
        ...this.columns(dto),
        fieldConfidence: Object.keys(confidence).length ? confidence : null,
      })
      .where(eq(reservations.id, id))
      .returning();
    return toReservation(updated);
  }

  /** "Looks right" after an import: confirmed, no more "Please check" flags. */
  async confirm(id: string, userId: string) {
    await this.load(id, userId, 'write');
    return this.setStatus(id, { status: 'confirmed', fieldConfidence: null });
  }

  async cancel(id: string, userId: string) {
    await this.load(id, userId, 'write');
    return this.setStatus(id, { status: 'cancelled' });
  }

  async remove(id: string, userId: string) {
    await this.load(id, userId, 'write');
    await this.db
      .update(reservations)
      .set({ deletedAt: new Date() })
      .where(eq(reservations.id, id));
  }

  private async setStatus(id: string, patch: Partial<Row>) {
    const [row] = await this.db
      .update(reservations)
      .set(patch)
      .where(eq(reservations.id, id))
      .returning();
    return toReservation(row);
  }

  /** DTO fields → columns (only the ones that were sent). */
  private columns(dto: UpdateReservationDto | CreateReservationDto) {
    const out: Partial<typeof reservations.$inferInsert> = {};
    const copy = [
      'type',
      'title',
      'provider',
      'location',
      'ref',
      'priceCents',
      'currency',
      'paid',
      'freeCancellationUntil',
      'checkInOpens',
      'guests',
      'hasPass',
      'tripId',
    ] as const;
    for (const k of copy)
      if (dto[k as keyof typeof dto] !== undefined)
        (out as Record<string, unknown>)[k] = dto[k as keyof typeof dto];
    if (dto.startAt) out.startAt = toPgDateTime(dto.startAt);
    if (dto.endAt !== undefined)
      out.endAt = dto.endAt ? toPgDateTime(dto.endAt) : null;
    return out;
  }
}
