import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { DashboardController } from './dashboard.controller';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [TripsModule],
  controllers: [ReservationsController, DashboardController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
