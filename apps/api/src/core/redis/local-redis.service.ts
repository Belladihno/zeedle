import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { IRedisService } from './redis.interface.js';

/** TCP client for local Docker Redis (development / test). */
@Injectable()
export class LocalRedisService implements IRedisService, OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      maxRetriesPerRequest: 3,
    });
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
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

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}
