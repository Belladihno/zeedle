import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalRedisService } from './local-redis.service.js';
import { REDIS_SERVICE } from './redis.interface.js';
import { UpstashRedisService } from './upstash-redis.service.js';

@Module({})
export class RedisModule {
  static forRoot(): DynamicModule {
    const provider = {
      provide: REDIS_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<string>('NODE_ENV') === 'production'
          ? new UpstashRedisService(config)
          : new LocalRedisService(config),
    };
    return {
      module: RedisModule,
      providers: [provider],
      exports: [provider],
    };
  }
}
