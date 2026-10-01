import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity.js';
import { Notification } from '../../modules/notifications/entities/notification.entity.js';
import { Settlement } from '../../modules/settlements/entities/settlement.entity.js';
import { Transaction } from '../../modules/transactions/entities/transaction.entity.js';
import { TransactionPin } from '../../modules/users/entities/transaction-pin.entity.js';
import { User } from '../../modules/users/entities/user.entity.js';
import { Wallet } from '../../modules/wallets/entities/wallet.entity.js';

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
    entities: [User, Wallet, Transaction, TransactionPin, Settlement, Notification, RefreshToken],
    ...(useSsl ? { ssl: { rejectUnauthorized: false as const } } : {}),
    extra: {
      max: 10,
      connectionTimeoutMillis: 10000,
    },
  };
}
