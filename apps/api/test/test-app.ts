import cookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter.js';
import { RateLimitGuard } from '../src/common/guards/rate-limit.guard.js';
import { TransformResponseInterceptor } from '../src/common/interceptors/transform-response.interceptor.js';
import { SanitizationPipe } from '../src/common/pipes/sanitization.pipe.js';
import { AuditLog } from '../src/modules/admin/entities/audit-log.entity.js';
import { Settlement } from '../src/modules/settlements/entities/settlement.entity.js';
import { Transaction } from '../src/modules/transactions/entities/transaction.entity.js';
import { User } from '../src/modules/users/entities/user.entity.js';
import { Wallet } from '../src/modules/wallets/entities/wallet.entity.js';

/**
 * Boots the full application the way main.ts does (Fastify, cookie support,
 * global filter/interceptor/pipes) so e2e hits the real request pipeline.
 * The rate-limit guard is opened: buckets are per-process infrastructure, and
 * a shared dev database would otherwise 429 the suite's own setup calls.
 */
export async function createTestApp(): Promise<NestFastifyApplication> {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(RateLimitGuard)
    .useValue({ canActivate: () => true })
    .compile();
  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  await app.register(cookie);
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    new SanitizationPipe(),
  );
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

export interface TestAccount {
  userId: string;
  email: string;
  password: string;
  token: string;
  accountNumber: string;
  walletId: string;
}

let counter = 0;

/** Registers a fresh user and returns an authenticated handle. */
export async function registerAccount(
  app: NestFastifyApplication,
  firstName = 'E2E',
): Promise<TestAccount> {
  counter += 1;
  const tag = `${Date.now()}-${counter}`;
  const email = `e2e-${tag}@test.local`;
  const password = 'E2ePass123!';
  const reg = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      firstName,
      lastName: 'User',
      email,
      phone: '+234700000000',
      password,
    },
  });
  if (reg.statusCode >= 300) {
    throw new Error(`register failed: ${reg.statusCode} ${reg.body}`);
  }
  const regData = reg.json().data as { user: { id: string }; accessToken: string };
  const me = await app.inject({
    method: 'GET',
    url: '/wallets/me',
    headers: { authorization: `Bearer ${regData.accessToken}` },
  });
  const wallet = me.json().data as { id: string; accountNumber: string };
  return {
    userId: regData.user.id,
    email,
    password,
    token: regData.accessToken,
    accountNumber: wallet.accountNumber,
    walletId: wallet.id,
  };
}

export async function setPin(
  app: NestFastifyApplication,
  token: string,
  pin = '1234',
): Promise<void> {
  const res = await app.inject({
    method: 'POST',
    url: '/users/pin',
    headers: { authorization: `Bearer ${token}` },
    payload: { pin },
  });
  if (res.statusCode >= 300) {
    throw new Error(`setPin failed: ${res.statusCode} ${res.body}`);
  }
}

export function idempotencyHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'x-idempotency-key': randomUUID() };
}

export function db(app: NestFastifyApplication): DataSource {
  return app.get(DataSource);
}

/**
 * Removes test users and everything they own. Order matters: transactions
 * reference settlements with NO ACTION, so they go before the batches;
 * wallets/PINs/tokens cascade from the user row itself.
 */
export async function deleteAccounts(
  app: NestFastifyApplication,
  userIds: string[],
): Promise<void> {
  if (!userIds.length) return;
  const source = db(app);
  const wallets = await source.getRepository(Wallet).findBy({ userId: In(userIds) });
  const walletIds = wallets.map((w) => w.id);
  if (walletIds.length) {
    await source.getRepository(Transaction).delete({ walletId: In(walletIds) });
  }
  await source.getRepository(Settlement).delete({ triggeredBy: In(userIds) });
  await source.getRepository(AuditLog).delete({ actorId: In(userIds) });
  await source.getRepository(User).delete(userIds);
}
