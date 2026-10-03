import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity.js';
import { Notification } from '../../modules/notifications/entities/notification.entity.js';
import { Settlement } from '../../modules/settlements/entities/settlement.entity.js';
import { Transaction } from '../../modules/transactions/entities/transaction.entity.js';
import { TransactionPin } from '../../modules/users/entities/transaction-pin.entity.js';
import { User } from '../../modules/users/entities/user.entity.js';
import { Wallet } from '../../modules/wallets/entities/wallet.entity.js';
import { AddTransactionIndexes1790812800001 } from '../../migrations/1790812800001-AddTransactionIndexes.js';
import { AddWalletAccountNumber1790966400002 } from '../../migrations/1790966400002-AddWalletAccountNumber.js';
import { CreateCoreTables1790812800000 } from '../../migrations/1790812800000-CreateCoreTables.js';

export function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  const url = config.getOrThrow<string>('DATABASE_URL');
  const useSsl = url.includes('neon.tech') || url.includes('sslmode=require');
  return {
    type: 'postgres',
    url,
    synchronize: false,
    entities: [User, Wallet, Transaction, TransactionPin, Settlement, Notification, RefreshToken],
    migrations: [
      CreateCoreTables1790812800000,
      AddTransactionIndexes1790812800001,
      AddWalletAccountNumber1790966400002,
    ],
    migrationsRun: true,
    ...(useSsl ? { ssl: { rejectUnauthorized: false as const } } : {}),
    extra: {
      max: 10,
      connectionTimeoutMillis: 10000,
      // Kills runaway queries instead of hanging the request behind them.
      statement_timeout: 30000,
    },
  };
}
