import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { addDays, dateOf, todayIso } from '../common/dates';
import { DB, type Database } from '../db/db.module';
import {
  placeNarrations,
  places,
  suggestionFeedback,
  userPreferences,
  users,
} from '../db/schema';
import { TripsService } from '../trips/trips.service';
import {
  freeWindows,
  gapAction,
  placeFacts,
  personalise,
  placesForWindow,
  windowLabel,
  type Busy,
  type CandidatePlace,
} from './suggest';

/** How long a booking keeps you busy when the ticket has no end time. */
const DEFAULT_MINUTES = {
  flight: 120,
  train: 120,
  museum: 150,
  tour: 180,
  restaurant: 90,
  hotel: 30,
} as const;
const plus = (at: string, minutes: number) => {
  const d = new Date(`${at}:00Z`);
  return new Date(d.getTime() + minutes * 60_000).toISOString().slice(0, 16);
};

@Injectable()
export class SuggestionsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly trips: TripsService,
  ) {}

  async forTrip(tripId: string, userId: string, today = todayIso()) {
    const trip = await this.trips.detail(tripId, userId, today);
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    const budget = user?.budgetLevel ?? 2;
    const prefs = await this.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });
    const rules = personalise(prefs ?? null);
    // places the user said "not for me" about are never suggested again
    const notForMe = new Set(
      (
        await this.db
          .select({ ref: suggestionFeedback.itemRef })
          .from(suggestionFeedback)
          .where(
            and(
              eq(suggestionFeedback.userId, userId),
              eq(suggestionFeedback.action, 'not_for_me'),
            ),
          )
      ).map((f) => f.ref),
    );
    const rs = trip.reservations.filter((r) => r.status !== 'cancelled');

    // places of the city that are not booked or planned yet
    const rows = trip.city.liveGuideEnabled
      ? await this.db
          .select()
          .from(places)
          .where(eq(places.cityId, trip.city.id))
      : [];
    const narrated = new Set(
      (
        await this.db
          .select({ id: placeNarrations.placeId })
          .from(placeNarrations)
      ).map((n) => n.id),
    );
    const taken = new Set(trip.planned.map((p) => p.placeId).filter(Boolean));
    const titles = [
      ...rs.map((r) => r.title),
      ...trip.planned.map((p) => p.title),
    ]
      .join(' | ')
      .toLowerCase();
    const candidates: CandidatePlace[] = rows
      .filter(
        (p) =>
          !taken.has(p.id) &&
          !notForMe.has(p.id) &&
          !titles.includes(p.name.toLowerCase().split(/[,(]/)[0].trim()),
      )
      .map((p) => ({ ...p, hasAudioGuide: narrated.has(p.id) }));

    const sections = [];

    // 1. Fix your trip
    if (trip.gaps.length)
      sections.push({
        id: 'fix',
        title: 'Fix your trip',
        badge: {
          tone: 'warn' as const,
          label:
            trip.gaps.length === 1
              ? trip.gaps[0].title
              : `${trip.gaps.length} things missing`,
        },
        items: trip.gaps.map((g) => ({
          id: `gap-${g.kind}-${g.date}`,
          kind: g.kind === 'stay' ? 'Hotel · 1 night' : 'Transport',
          title: g.title,
          facts: [],
          why: g.detail,
          photoUrl: null,
          tags: [],
          action: gapAction(g, trip.city.name, trip.endDate),
        })),
      });

    // 2. Fill your free time (only for trips that have not ended)
    if (trip.endDate >= today && candidates.length) {
      const busy: Busy[] = [
        ...rs.flatMap((r) =>
          r.type === 'hotel'
            ? [
                { start: r.startAt, end: plus(r.startAt, 30) },
                ...(r.endAt
                  ? [{ start: r.endAt, end: plus(r.endAt, 30) }]
                  : []),
              ]
            : [
                {
                  start: r.startAt,
                  end:
                    r.endAt && dateOf(r.endAt) === dateOf(r.startAt)
                      ? r.endAt
                      : plus(r.startAt, DEFAULT_MINUTES[r.type]),
                },
              ],
        ),
        ...trip.planned
          .filter((p) => p.startTime)
          .map((p) => {
            const start = `${p.date}T${p.startTime}`;
            const minutes =
              rows.find((x) => x.id === p.placeId)?.visitMinutes ?? 60;
            return {
              start,
              end: p.endTime ? `${p.date}T${p.endTime}` : plus(start, minutes),
            };
          }),
      ];
      const transport = rs.filter(
        (r) => r.type === 'flight' || r.type === 'train',
      );
      const arrival = transport.find(
        (r) => dateOf(r.startAt) === trip.startDate,
      );
      const departure = transport.find(
        (r) => dateOf(r.startAt) === trip.endDate,
      );
      const days = trip.days.map((d) => d.date).filter((d) => d >= today);
      const windows = freeWindows(days, busy, {
        arrival: arrival?.endAt ?? arrival?.startAt,
        departure: departure?.startAt,
        minMinutes: rules.minWindowMinutes,
      });
      const used = new Set<string>();
      for (const w of windows.slice(0, 3)) {
        const picks = placesForWindow(
          w,
          candidates.filter((c) => !used.has(c.id)),
          budget,
          rules.picksPerWindow,
          rules.boost,
        );
        if (!picks.length) continue;
        picks.forEach((p) => used.add(p.id));
        const dayNumber = trip.days.findIndex((d) => d.date === w.date) + 1;
        sections.push({
          id: `free-${w.date}-${w.from}`,
          title: 'Fill your free time',
          badge: { tone: 'info' as const, label: windowLabel(w, dayNumber) },
          items: picks.map((p) => ({
            id: p.id,
            kind: p.kind,
            title: p.name,
            facts: placeFacts(p),
            why: `Fits your free time on Day ${dayNumber} (${w.from}–${w.to}).`,
            photoUrl: p.photoUrl,
            tags: p.hasAudioGuide
              ? [{ tone: 'info' as const, label: 'Audio guide' }]
              : [],
            action: {
              type: 'add_to_plan' as const,
              label: `Add to Day ${dayNumber}`,
              date: w.date,
              startTime: w.from,
              placeId: p.id,
            },
          })),
        });
      }
      candidates.splice(
        0,
        candidates.length,
        ...candidates.filter((c) => !used.has(c.id)),
      );
    }

    // 3. Don't miss
    const top = [...candidates].sort((a, b) => a.rank - b.rank).slice(0, 3);
    if (top.length)
      sections.push({
        id: 'miss',
        title: `Don't miss in ${trip.city.name}`,
        badge: {
          tone: 'info' as const,
          label: 'Top places not in your plan yet',
        },
        items: top.map((p) => ({
          id: p.id,
          kind: p.kind,
          title: p.name,
          facts: placeFacts(p),
          why: p.hasAudioGuide
            ? 'One of the city’s highlights, with an audio guide in the app.'
            : 'One of the city’s highlights.',
          photoUrl: p.photoUrl,
          tags: p.hasAudioGuide
            ? [{ tone: 'info' as const, label: 'Audio guide' }]
            : [],
          action: {
            type: 'add_to_plan' as const,
            label: 'Add to plan',
            date: trip.startDate > today ? addDays(trip.startDate, 1) : today,
            startTime: null,
            placeId: p.id,
          },
        })),
      });

    return { tripId, city: trip.city.name, sections };
  }
}
