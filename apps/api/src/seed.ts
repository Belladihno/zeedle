import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { CoreModule } from './core/core.module.js';
import { validateEnv } from './core/config/env.validation.js';
import { Notification } from './modules/notifications/entities/notification.entity.js';
import { Transaction } from './modules/transactions/entities/transaction.entity.js';
import { TransactionPin } from './modules/users/entities/transaction-pin.entity.js';
import { User } from './modules/users/entities/user.entity.js';
import { Wallet } from './modules/wallets/entities/wallet.entity.js';

@Module({ imports: [CoreModule] })
class SeedModule {}

function credit(
  wallet: Wallet,
  amount: number,
  balanceBefore: number,
  referenceId: string,
): Transaction {
  const tx = new Transaction();
  tx.walletId = wallet.id;
  tx.type = 'CREDIT';
  tx.status = 'SUCCESS';
  tx.source = 'PAYSTACK';
  tx.amount = amount;
  tx.fee = 0;
  tx.balanceBefore = balanceBefore;
  tx.balanceAfter = balanceBefore + amount;
  tx.referenceId = referenceId;
  tx.externalReference = `paystack_${referenceId}`;
  tx.narration = 'Seed funding';
  tx.metadata = null;
  tx.settlementId = null;
  return tx;
}

async function bootstrap(): Promise<void> {
  validateEnv();
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['log'] });
  try {
    const db = app.get(DataSource);
    const users = db.getRepository(User);
    const wallets = db.getRepository(Wallet);
    const transactions = db.getRepository(Transaction);
    const pins = db.getRepository(TransactionPin);
    const notifications = db.getRepository(Notification);

    if (await users.findOneBy({ email: 'user@zeedle.test' })) {
      console.log('Seed already applied, skipping.');
      return;
    }

    const admin = await users.save(
      users.create({
        email: 'admin@zeedle.test',
        firstName: 'Ada',
        lastName: 'Admin',
        phone: null,
        passwordHash: await bcrypt.hash('AdminPass123!', 12),
        role: 'ADMIN',
      }),
    );

    const consumer = await users.save(
      users.create({
        email: 'user@zeedle.test',
        firstName: 'Test',
        lastName: 'User',
        phone: '08012345678',
        passwordHash: await bcrypt.hash('UserPass123!', 12),
        role: 'USER',
      }),
    );

    const wallet = await wallets.save(
      wallets.create({ userId: consumer.id, balanceKobo: 500000 }),
    );

    const first = await transactions.save(credit(wallet, 200000, 0, 'seed-fund-1'));
    await transactions.save(credit(wallet, 300000, first.balanceAfter, 'seed-fund-2'));

    const pin = new TransactionPin();
    pin.userId = consumer.id;
    pin.pinHash = await bcrypt.hash('1234', 12);
    await pins.save(pin);

    const notice = new Notification();
    notice.userId = consumer.id;
    notice.title = 'Wallet funded';
    notice.body = 'Your wallet was credited with 5,000 naira.';
    notice.type = 'CREDIT';
    await notifications.save(notice);

    console.log(`Seeded admin ${admin.email}, consumer ${consumer.email}, wallet 500000 kobo.`);
  } finally {
    await app.close();
  }
}
await bootstrap();
