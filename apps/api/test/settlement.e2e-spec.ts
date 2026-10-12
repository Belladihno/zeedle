import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import { Role } from '@zeedle/shared-types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Transaction } from '../src/modules/transactions/entities/transaction.entity.js';
import { User } from '../src/modules/users/entities/user.entity.js';
import {
  createTestApp,
  db,
  deleteAccounts,
  registerAccount,
  type TestAccount,
} from './test-app.js';

describe('settlement run (e2e)', () => {
  let app: NestFastifyApplication;
  let admin: TestAccount;
  let earner: TestAccount;

  beforeAll(async () => {
    app = await createTestApp();
    admin = await registerAccount(app, 'Admin');
    await db(app).getRepository(User).update({ id: admin.userId }, { role: Role.ADMIN });
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: admin.email, password: admin.password },
    });
    admin.token = login.json().data.accessToken as string;

    earner = await registerAccount(app, 'Earner');
    // Drop orphan rows from earlier manual probing so the window is deterministic.
    await db(app)
      .getRepository(Transaction)
      .createQueryBuilder()
      .delete()
      .where('"referenceId" LIKE :probe', { probe: 'probe-%' })
      .execute();
    // Two settled-eligible credits inside the window under test.
    const repo = db(app).getRepository(Transaction);
    await repo.save([
      repo.create({
        walletId: earner.walletId,
        type: 'CREDIT',
        status: 'SUCCESS',
        source: 'TRANSFER',
        amount: 200000,
        fee: 0,
        balanceBefore: 0,
        balanceAfter: 200000,
        referenceId: `e2e_${randomUUID()}`,
      }),
      repo.create({
        walletId: earner.walletId,
        type: 'CREDIT',
        status: 'SUCCESS',
        source: 'TRANSFER',
        amount: 300000,
        fee: 0,
        balanceBefore: 200000,
        balanceAfter: 500000,
        referenceId: `e2e_${randomUUID()}`,
      }),
    ]);
  }, 60000);

  afterAll(async () => {
    await deleteAccounts(app, [admin.userId, earner.userId]);
    await app.close();
  });

  const adminHeaders = () => ({ authorization: `Bearer ${admin.token}` });

  it('settles the window and records the run in the audit log', async () => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const run = await app.inject({
      method: 'POST',
      url: '/settlements/run',
      headers: adminHeaders(),
      payload: { periodStart: start.toISOString(), periodEnd: end.toISOString() },
    });
    expect(run.statusCode).toBe(201);
    const batch = run.json().data as { totalAmount: number; transactionCount: number; id: string };
    expect(batch.totalAmount).toBe(500000);
    expect(batch.transactionCount).toBe(2);

    const audit = await app.inject({
      method: 'GET',
      url: '/admin/audit-logs?limit=5',
      headers: adminHeaders(),
    });
    const runs = (audit.json().data.items as { action: string; targetId: string }[]).filter(
      (a) => a.action === 'SETTLEMENT_RUN' && a.targetId === batch.id,
    );
    expect(runs).toHaveLength(1);
  });

  it('rejects a second run over the same window with 400', async () => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const run = await app.inject({
      method: 'POST',
      url: '/settlements/run',
      headers: adminHeaders(),
      payload: { periodStart: start.toISOString(), periodEnd: end.toISOString() },
    });
    expect(run.statusCode).toBe(400);
  });
});
