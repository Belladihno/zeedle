import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { AppLoggerModule } from './logger/logger.module.js';
import { RedisModule } from './redis/redis.module.js';

/** Framework-level concerns, loaded once for the whole application. */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule.forRoot(),
    AppLoggerModule,
  ],
  exports: [ConfigModule, DatabaseModule, RedisModule, AppLoggerModule],
})
export class CoreModule {}
