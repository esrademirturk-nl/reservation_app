import Anthropic from '@anthropic-ai/sdk';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { TripsModule } from '../trips/trips.module';
import { GuideController } from './guide.controller';
import { PlacesService } from './places.service';
import { SuggestionsService } from './suggestions.service';
import { ClaudeTranslator, NARRATION_TRANSLATOR } from './translator';

@Module({
  imports: [TripsModule],
  controllers: [GuideController],
  providers: [
    PlacesService,
    SuggestionsService,
    {
      // with an API key, missing audio-guide languages are translated once and cached
      provide: NARRATION_TRANSLATOR,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const key = config.get('ANTHROPIC_API_KEY', { infer: true });
        return key
          ? new ClaudeTranslator(
              new Anthropic({ apiKey: key }),
              config.get('ANTHROPIC_MODEL', { infer: true }),
            )
          : null;
      },
    },
  ],
})
export class GuideModule {}
