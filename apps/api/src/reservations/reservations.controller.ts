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
  CreateReservationDto,
  ListReservationsQuery,
  UpdateReservationDto,
} from './dto';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  /** GET /reservations?tripId=…  |  ?unsorted=true  |  ?status=pending (needs review) */
  @Get()
  list(@CurrentUser() me: AuthUser, @Query() q: ListReservationsQuery) {
    return this.reservations.list(me.id, q);
  }

  @Post()
  create(@CurrentUser() me: AuthUser, @Body() dto: CreateReservationDto) {
    return this.reservations.create(me.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() me: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.reservations.get(id, me.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() me: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservations.update(id, me.id, dto);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  confirm(@CurrentUser() me: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.reservations.confirm(id, me.id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() me: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.reservations.cancel(id, me.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() me: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.reservations.remove(id, me.id);
  }
}
