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
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AddPlanItemDto, UpdatePlanItemDto } from './dto';
import { PlanService } from './plan.service';

@Controller('trips/:tripId/plan')
export class PlanController {
  constructor(private readonly plan: PlanService) {}

  @Get()
  list(
    @CurrentUser() me: AuthUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    return this.plan.list(tripId, me.id);
  }

  /** POST /trips/:tripId/plan — e.g. { date, placeId, startTime } from a suggestion's "Add to Day 2" */
  @Post()
  add(
    @CurrentUser() me: AuthUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: AddPlanItemDto,
  ) {
    return this.plan.add(tripId, me.id, dto);
  }

  @Patch(':itemId')
  update(
    @CurrentUser() me: AuthUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdatePlanItemDto,
  ) {
    return this.plan.update(tripId, itemId, me.id, dto);
  }

  @Delete(':itemId')
  @HttpCode(204)
  async remove(
    @CurrentUser() me: AuthUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    await this.plan.remove(tripId, itemId, me.id);
  }
}
