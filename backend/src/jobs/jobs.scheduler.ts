import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import { JobsService, SYSTEM_USER } from './jobs.service';

const QUEUE = 'live-arts-jobs';

/**
 * BullMQ scheduler (Requirements §11). Registers repeatable jobs and a worker
 * that runs the pipelines system-wide. Gated by ENABLE_QUEUES — without Redis the
 * scheduler stays dormant and the manual /jobs/run/* endpoints are used instead.
 */
@Injectable()
export class JobsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('JobsScheduler');
  private readonly enabled: boolean;
  private readonly redisUrl: string;
  private connection?: Redis;
  private queue?: Queue;
  private worker?: Worker;

  constructor(config: ConfigService, private readonly jobs: JobsService) {
    this.enabled = !!config.get('enableQueues');
    this.redisUrl = config.get<string>('redisUrl')!;
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn(
        'BullMQ scheduler disabled (ENABLE_QUEUES=false). Trigger via POST /jobs/run/* or start Redis and enable it.',
      );
      return;
    }
    try {
      this.connection = new IORedis(this.redisUrl, { maxRetriesPerRequest: null });
      this.queue = new Queue(QUEUE, { connection: this.connection });

      // Daily 01:30 IST, monthly on the 1st at 01:00 IST.
      await this.queue.upsertJobScheduler('daily-recompute', { pattern: '30 1 * * *', tz: 'Asia/Kolkata' });
      await this.queue.upsertJobScheduler('monthly-jobs', { pattern: '0 1 1 * *', tz: 'Asia/Kolkata' });

      this.worker = new Worker(
        QUEUE,
        async (job) => {
          if (job.name === 'daily-recompute') return this.jobs.runDaily(SYSTEM_USER);
          if (job.name === 'monthly-jobs') return this.jobs.runMonthly(SYSTEM_USER);
          return null;
        },
        { connection: new IORedis(this.redisUrl, { maxRetriesPerRequest: null }) },
      );
      this.worker.on('failed', (job, err) => this.logger.error(`Job ${job?.name} failed: ${err.message}`));
      this.logger.log('BullMQ scheduler registered (daily 01:30 IST, monthly 1st 01:00 IST).');
    } catch (e) {
      this.logger.error(`Failed to start scheduler: ${(e as Error).message}`);
    }
  }

  status() {
    return {
      queuesEnabled: this.enabled,
      schedules: this.enabled
        ? [
            { name: 'daily-recompute', cron: '30 1 * * * (Asia/Kolkata)' },
            { name: 'monthly-jobs', cron: '0 1 1 * * (Asia/Kolkata)' },
          ]
        : [],
      lastDaily: this.jobs.lastDaily ?? null,
      lastMonthly: this.jobs.lastMonthly ?? null,
    };
  }

  async onModuleDestroy() {
    try {
      await this.worker?.close();
      await this.queue?.close();
      this.connection?.disconnect();
    } catch {
      /* ignore */
    }
  }
}
