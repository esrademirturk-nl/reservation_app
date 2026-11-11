import { Global, Module } from '@nestjs/common';
import { ConsentsService } from './consents.service';
import { CustomerController } from './customer.controller';
import { EventsService } from './events.service';
import { PreferencesService } from './preferences.service';

/** Consents, preferences and event tracking — used by every feature module, hence global. */
@Global()
@Module({
  controllers: [CustomerController],
  providers: [ConsentsService, EventsService, PreferencesService],
  exports: [ConsentsService, EventsService, PreferencesService],
})
export class CustomerModule {}
