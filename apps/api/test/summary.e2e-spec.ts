import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Transaction } from '../src/modules/transactions/entities/transaction.entity.js';
import {
  createTestApp,
  db,
  deleteAccounts,
  registerAccount,
  type TestAccount,
} from './test-app.js';

describe('transaction summary (e2e)', () => {
  let app: NestFastifyApplication;
  let user: TestAccount;

  beforeAll(async () => {
    app = await createTestApp();
    user = await registerAccount(app, 'Summ');
  }, 60000);

  afterAll(async () => {
    await deleteAccounts(app, [user.userId]);
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${user.token}` });

  it('returns zeros for a fresh wallet', async () => {
    const res = await app.inject({ method: 'GET', url: '/transactions/summary', headers: auth() });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({
      inflowKobo: 0,
      outflowKobo: 0,
      inflowCount: 0,
      outflowCount: 0,
    });
  });

  it('aggregates settled rows and ignores pending ones', async () => {
    const repo = db(app).getRepository(Transaction);
    const rows = [
      { type: 'CREDIT', status: 'SUCCESS', amount: 200000 },
      { type: 'CREDIT', status: 'SUCCESS', amount: 300000 },
      { type: 'DEBIT', status: 'SUCCESS', amount: 50000 },
      { type: 'CREDIT', status: 'PENDING', amount: 999999 },
    ] as const;
    await repo.save(
      rows.map((r, i) =>
        repo.create({
          walletId: user.walletId,
          type: r.type,
          status: r.status,
          source: 'TRANSFER',
          amount: r.amount,
          fee: 0,
          balanceBefore: 0,
          balanceAfter: 0,
          referenceId: `e2e_sum_${i}_${randomUUID()}`,
        }),
      ),
    );
    const res = await app.inject({ method: 'GET', url: '/transactions/summary', headers: auth() });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({
      inflowKobo: 500000,
      outflowKobo: 50000,
      inflowCount: 2,
      outflowCount: 1,
    });
  });

  it('rejects a malformed month with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/transactions/summary?month=2026-13',
      headers: auth(),
    });
    expect(res.statusCode).toBe(400);
  });
});
