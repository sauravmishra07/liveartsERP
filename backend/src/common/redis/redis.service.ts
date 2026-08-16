import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { Redis } from 'ioredis';

/**
 * Resilient Redis wrapper. If Redis is unavailable it logs a warning and
 * reports not-ready instead of crashing the app — callers degrade gracefully.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Redis');
  private readonly client: Redis;
  private ready = false;

  constructor(config: ConfigService) {
    const url = config.get<string>('redisUrl')!;
    this.client = new IORedis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 300, 2000)),
    });
    this.client.on('ready', () => {
      this.ready = true;
      this.logger.log('Connected to Redis');
    });
    this.client.on('end', () => (this.ready = false));
    this.client.on('error', (e) => {
      if (this.ready) this.logger.warn(`Redis error: ${e.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch (e) {
      this.logger.warn(
        `Redis not reachable (${(e as Error).message}). ` +
          'Refresh tokens fall back to in-memory (dev only); BullMQ jobs disabled until Redis is up.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      /* ignore */
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.ready) return;
    if (ttlSeconds) await this.client.set(key, value, 'EX', ttlSeconds);
    else await this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    if (!this.ready) return null;
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    if (!this.ready) return;
    await this.client.del(key);
  }
}
