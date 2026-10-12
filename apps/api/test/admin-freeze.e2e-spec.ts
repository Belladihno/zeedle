import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Role } from '@zeedle/shared-types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { User } from '../src/modules/users/entities/user.entity.js';
import {
  createTestApp,
  db,
  deleteAccounts,
  idempotencyHeaders,
  registerAccount,
  setPin,
  type TestAccount,
} from './test-app.js';

describe('admin freeze cycle (e2e)', () => {
  let app: NestFastifyApplication;
  let admin: TestAccount;
  let subject: TestAccount;

  beforeAll(async () => {
    app = await createTestApp();
    admin = await registerAccount(app, 'Admin');
    await db(app).getRepository(User).update({ id: admin.userId }, { role: Role.ADMIN });
    // Re-login: the role is minted into the JWT at login time.
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: admin.email, password: admin.password },
    });
    admin.token = login.json().data.accessToken as string;
    subject = await registerAccount(app, 'Subject');
    await setPin(app, subject.token);
  }, 60000);

  afterAll(async () => {
    await deleteAccounts(app, [admin.userId, subject.userId]);
    await app.close();
  });

  const adminHeaders = () => ({ authorization: `Bearer ${admin.token}` });

  it('freezes a wallet with a mandatory reason', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/users/${subject.userId}/wallet`,
      headers: adminHeaders(),
      payload: { action: 'FREEZE', reason: 'e2e freeze verification' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ userId: subject.userId, isActive: false });
  });

  it('blocks transfers from a frozen wallet with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/transfers',
      headers: idempotencyHeaders(subject.token),
      payload: { recipientId: admin.userId, amount: 100, pin: '1234' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects double-freeze with 409 and short reasons with 400', async () => {
    const again = await app.inject({
      method: 'PATCH',
      url: `/admin/users/${subject.userId}/wallet`,
      headers: adminHeaders(),
      payload: { action: 'FREEZE', reason: 'e2e freeze verification' },
    });
    expect(again.statusCode).toBe(409);
    const short = await app.inject({
      method: 'PATCH',
      url: `/admin/users/${subject.userId}/wallet`,
      headers: adminHeaders(),
      payload: { action: 'UNFREEZE', reason: 'x' },
    });
    expect(short.statusCode).toBe(400);
  });

  it('unfreezes and records both actions in the audit log', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/users/${subject.userId}/wallet`,
      headers: adminHeaders(),
      payload: { action: 'UNFREEZE', reason: 'e2e complete, lifting freeze' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ isActive: true });

    const audit = await app.inject({
      method: 'GET',
      url: '/admin/audit-logs?limit=10',
      headers: adminHeaders(),
    });
    const actions = (audit.json().data.items as { action: string }[]).map((a) => a.action);
    expect(actions).toContain('WALLET_FREEZE');
    expect(actions).toContain('WALLET_UNFREEZE');
  });

  it('rejects non-admin tokens on admin routes with 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/metrics',
      headers: { authorization: `Bearer ${subject.token}` },
    });
    expect(res.statusCode).toBe(403);
  });
});
