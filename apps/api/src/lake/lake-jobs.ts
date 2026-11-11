import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import type { Env } from '../config/env';
import { redisConnection } from '../imports/import-queue';
import { LakeService } from './lake.service';

/**
 * With Redis: ships events every 15 minutes and takes the snapshot at 02:30 every night.
 * Without Redis run them by hand: `npm run lake:ship`, `npm run lake:snapshot`.
 */
@Injectable()
export class LakeJobs implements OnModuleInit, OnApplicationShutdown {
  private readonly log = new Logger(LakeJobs.name);
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly lake: LakeService,
  ) {}

  async onModuleInit() {
    const url = this.config.get('REDIS_URL', { infer: true });
    if (!url || this.config.get('IMPORT_WORKER', { infer: true }) === 'false')
      return;
    const connection = redisConnection(url);
    this.queue = new Queue('lake', { connection });
    await this.queue.upsertJobScheduler(
      'ship-events',
      { pattern: '*/15 * * * *' },
      { name: 'ship' },
    );
    await this.queue.upsertJobScheduler(
      'daily-snapshot',
      { pattern: '30 2 * * *', tz: 'Europe/Amsterdam' },
      { name: 'snapshot' },
    );
    this.worker = new Worker(
      'lake',
      (job) =>
        job.name === 'snapshot' ? this.lake.snapshot() : this.lake.shipEvents(),
      { connection },
    );
    this.log.log('Lake jobs scheduled');
  }

  async onApplicationShutdown() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
