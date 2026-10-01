import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
import type { IRedisService } from './redis.interface.js';

/** HTTP client for Upstash Redis (production). Same interface, different transport. */
@Injectable()
export class UpstashRedisService implements IRedisService {
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis({
      url: config.getOrThrow<string>('UPSTASH_REDIS_REST_URL'),
      token: config.getOrThrow<string>('UPSTASH_REDIS_REST_TOKEN'),
    });
  }

  get(key: string): Promise<string | null> {
    return this.client.get<string>(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, { ex: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }
}
