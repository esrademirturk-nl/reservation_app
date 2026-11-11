import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import {
  CreateTripDto,
  ListTripsQuery,
  TodayQuery,
  UpdateTripDto,
} from './dto';
import { TripsService } from './trips.service';

@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  /** GET /trips?when=upcoming — each trip with nights, readiness, number of bookings and total */
  @Get()
  list(@CurrentUser() me: AuthUser, @Query() q: ListTripsQuery) {
    return this.trips.list(me.id, q.when, q.today);
  }

  @Post()
  create(@CurrentUser() me: AuthUser, @Body() dto: CreateTripDto) {
    return this.trips.create(me.id, dto);
  }

  /** GET /trips/:id — trip, readiness, gaps, deadlines, day-by-day timeline and reservations */
  @Get(':id')
  detail(
    @CurrentUser() me: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: TodayQuery,
  ) {
    return this.trips.detail(id, me.id, q.today);
  }

  @Patch(':id')
  update(
    @CurrentUser() me: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.trips.update(id, me.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() me: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.trips.remove(id, me.id);
  }
}
