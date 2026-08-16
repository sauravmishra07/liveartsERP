import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';

/**
 * Refresh-token whitelist (Requirements §8, §32).
 * Primary store is Redis (enables rotation + server-side revocation/logout).
 * If Redis is down, falls back to an in-memory map — DEV ONLY, logged loudly.
 */
@Injectable()
export class TokenStoreService {
  private readonly logger = new Logger('TokenStore');
  private readonly memory = new Map<string, number>(); // key -> expiry (ms)
  private warned = false;

  constructor(private readonly redis: RedisService) {}

  private key(userId: string, jti: string): string {
    return `refresh:${userId}:${jti}`;
  }

  private usingMemory(): boolean {
    if (!this.redis.isReady()) {
      if (!this.warned) {
        this.logger.warn('Redis down — using in-memory refresh store (dev only).');
        this.warned = true;
      }
      return true;
    }
    return false;
  }

  async save(userId: string, jti: string, ttlSeconds: number): Promise<void> {
    if (this.usingMemory()) {
      this.memory.set(this.key(userId, jti), Date.now() + ttlSeconds * 1000);
      return;
    }
    await this.redis.set(this.key(userId, jti), '1', ttlSeconds);
  }

  async isValid(userId: string, jti: string): Promise<boolean> {
    if (this.usingMemory()) {
      const exp = this.memory.get(this.key(userId, jti));
      if (!exp) return false;
      if (exp < Date.now()) {
        this.memory.delete(this.key(userId, jti));
        return false;
      }
      return true;
    }
    return (await this.redis.get(this.key(userId, jti))) === '1';
  }

  async revoke(userId: string, jti: string): Promise<void> {
    if (this.usingMemory()) {
      this.memory.delete(this.key(userId, jti));
      return;
    }
    await this.redis.del(this.key(userId, jti));
  }

  async revokeAll(userId: string): Promise<void> {
    if (this.usingMemory()) {
      for (const k of this.memory.keys()) {
        if (k.startsWith(`refresh:${userId}:`)) this.memory.delete(k);
      }
      return;
    }
    // Small key space per user; KEYS is acceptable here.
    // ponytail: switch to SCAN if a user ever accumulates many sessions.
    const client = this.redis.getClient();
    const keys = await client.keys(`refresh:${userId}:*`);
    if (keys.length) await client.del(...keys);
  }
}
