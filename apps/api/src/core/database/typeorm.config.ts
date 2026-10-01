import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  const url = config.getOrThrow<string>('DATABASE_URL');
  // Neon (serverless Postgres) requires TLS; local Docker Postgres does not.
  const useSsl = url.includes('neon.tech') || url.includes('sslmode=require');
  return {
    type: 'postgres',
    url,
    // Migrations are the only permitted schema path. Never auto-sync.
    synchronize: false,
    // Entities register here in Phase 2 (Step 16).
    entities: [],
    ...(useSsl ? { ssl: { rejectUnauthorized: false as const } } : {}),
    extra: {
      max: 10,
      connectionTimeoutMillis: 10000,
    },
  };
}
