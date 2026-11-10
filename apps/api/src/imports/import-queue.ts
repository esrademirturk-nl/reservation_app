import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import type { Env } from '../config/env';
import { ImportsService } from './imports.service';

const ATTEMPTS = 3;
type Job =
  | { name: 'extract'; data: { documentId: string; hint?: string } }
  | { name: 'purge'; data: Record<string, never> };

/** "redis://user:pass@host:6379/0" → BullMQ connection options */
export const redisConnection = (url: string): ConnectionOptions => {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: Number(u.pathname.slice(1) || 0),
    tls: u.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null, // required by BullMQ workers
  };
};

/**
 * Reading a booking can take seconds (PDF parsing, AI call), so it runs in a background queue.
 * With REDIS_URL: BullMQ queue + worker, 3 attempts with back-off, and a daily purge of old raw emails.
 * Without it (local development, tests): the document is read right away, inside the request.
 */
@Injectable()
export class ImportQueue implements OnModuleInit, OnApplicationShutdown {
  private readonly log = new Logger(ImportQueue.name);
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly imports: ImportsService,
  ) {}

  get mode() {
    return this.queue ? 'queue' : 'inline';
  }

  async onModuleInit() {
    const url = this.config.get('REDIS_URL', { infer: true });
    if (!url) return;
    const connection = redisConnection(url);
    this.queue = new Queue('imports', { connection });
    this.worker = new Worker(
      'imports',
      async (job) => {
        const j = job as unknown as Job & { attemptsMade: number };
        if (j.name === 'purge') return this.imports.purgeExpired();
        return this.imports.process(j.data.documentId, {
          hint: j.data.hint,
          finalAttempt: j.attemptsMade + 1 >= ATTEMPTS,
        });
      },
      { connection, concurrency: 2 },
    );
    this.worker.on('failed', (job, err) =>
      this.log.warn(`Job ${job?.id} failed: ${err.message}`),
    );
    await this.queue.upsertJobScheduler(
      'purge-raw-emails',
      { pattern: '0 3 * * *' },
      { name: 'purge', data: {} },
    );
    this.log.log('Import queue connected to Redis');
  }

  async enqueue(documentId: string, hint?: string) {
    if (!this.queue) return this.imports.process(documentId, { hint });
    await this.queue.add(
      'extract',
      { documentId, hint },
      {
        attempts: ATTEMPTS,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
  }

  async onApplicationShutdown() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
