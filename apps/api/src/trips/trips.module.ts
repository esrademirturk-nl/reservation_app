import { Module } from '@nestjs/common';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  controllers: [TripsController, PlanController],
  providers: [TripsService, PlanService],
  exports: [TripsService, PlanService],
})
export class TripsModule {}
