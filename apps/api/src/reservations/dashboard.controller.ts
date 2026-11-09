import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { todayIso } from '../common/dates';
import { TodayQuery } from '../trips/dto';
import { deadlines, gaps } from '../trips/planning';
import { TripsService } from '../trips/trips.service';
import { ReservationsService } from './reservations.service';

/** Everything the Dashboard screen needs, in one request. */
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly trips: TripsService,
    private readonly reservations: ReservationsService,
  ) {}

  @Get()
  async get(@CurrentUser() me: AuthUser, @Query() q: TodayQuery) {
    const today = q.today ?? todayIso();
    const upcoming = await this.trips.list(me.id, 'upcoming', today);
    const details = await Promise.all(
      upcoming.map((t) => this.trips.detail(t.id, me.id, today)),
    );
    const unsorted = await this.reservations.list(me.id, { unsorted: true });
    return {
      today,
      nextTrip: upcoming[0] ?? null,
      upcoming,
      stats: {
        upcomingTrips: upcoming.length,
        bookings: upcoming.reduce((n, t) => n + t.reservationCount, 0),
        countries: new Set(upcoming.map((t) => t.city.countryCode)).size,
      },
      gaps: details.flatMap((d) =>
        gaps(
          {
            id: d.id,
            city: d.city.name,
            startDate: d.startDate,
            endDate: d.endDate,
          },
          d.reservations,
        ),
      ),
      deadlines: deadlines(
        details.flatMap((d) => d.reservations),
        today,
      ).slice(0, q.limit ?? 5),
      recentlyAdded: await this.reservations.recent(me.id, 3),
      needsReview:
        details.reduce((n, d) => n + d.needsReviewCount, 0) +
        unsorted.filter((r) => r.status === 'pending').length,
      unsortedCount: unsorted.filter((r) => r.status !== 'cancelled').length,
    };
  }
}
