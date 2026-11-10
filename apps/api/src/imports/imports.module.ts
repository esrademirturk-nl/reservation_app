import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '../config/env';
import { TripsModule } from '../trips/trips.module';
import { ClaudeExtractor } from './extraction/claude';
import { RuleBasedExtractor } from './extraction/rule-based';
import { EXTRACTION_PROVIDER } from './extraction/types';
import { ImportQueue } from './import-queue';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { InboundController } from './inbound.controller';
import { InboundService } from './inbound.service';

@Module({
  imports: [
    TripsModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      // files stay in memory (max UPLOAD_MAX_MB) and go straight to storage
      useFactory: (config: ConfigService<Env, true>) => ({
        limits: {
          fileSize: config.get('UPLOAD_MAX_MB', { infer: true }) * 1024 * 1024,
          files: 1,
        },
      }),
    }),
  ],
  controllers: [ImportsController, InboundController],
  providers: [
    ImportsService,
    ImportQueue,
    InboundService,
    {
      // Claude reads bookings when a key is configured; otherwise the offline rule-based reader
      provide: EXTRACTION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const key = config.get('ANTHROPIC_API_KEY', { infer: true });
        return key
          ? new ClaudeExtractor(
              new Anthropic({ apiKey: key }),
              config.get('ANTHROPIC_MODEL', { infer: true }),
            )
          : new RuleBasedExtractor();
      },
    },
  ],
  exports: [ImportsService],
})
export class ImportsModule {}
