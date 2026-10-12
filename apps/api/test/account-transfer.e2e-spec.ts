import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { buildAccountNumber } from '@zeedle/shared-types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Transaction } from '../src/modules/transactions/entities/transaction.entity.js';
import { Wallet } from '../src/modules/wallets/entities/wallet.entity.js';
import {
  createTestApp,
  db,
  deleteAccounts,
  idempotencyHeaders,
  registerAccount,
  setPin,
  type TestAccount,
} from './test-app.js';

describe('account-number transfers (e2e)', () => {
  let app: NestFastifyApplication;
  let alice: TestAccount;
  let bob: TestAccount;

  beforeAll(async () => {
    app = await createTestApp();
    alice = await registerAccount(app, 'Alice');
    bob = await registerAccount(app, 'Bob');
    await setPin(app, alice.token);
    await setPin(app, bob.token);
    // Alice starts with ₦1000 (100000 kobo).
    await db(app).getRepository(Wallet).update({ id: alice.walletId }, { balanceKobo: 100000 });
  }, 60000);

  afterAll(async () => {
    await deleteAccounts(app, [alice.userId, bob.userId]);
    await app.close();
  });

  it('resolves a valid account number to a name', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/users/resolve?accountNumber=${bob.accountNumber}`,
      headers: { authorization: `Bearer ${alice.token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ firstName: 'Bob' });
  });

  it('rejects a typoed number with 400 and an unknown one with 404', async () => {
    const badCheck = bob.accountNumber.slice(0, 9) + ((Number(bob.accountNumber[9]) + 1) % 10);
    const typo = await app.inject({
      method: 'GET',
      url: `/users/resolve?accountNumber=${badCheck}`,
      headers: { authorization: `Bearer ${alice.token}` },
    });
    expect(typo.statusCode).toBe(400);
    // Well-formed but unassigned (the seed account owns 1234567895, so mint another).
    const unknown = await app.inject({
      method: 'GET',
      url: `/users/resolve?accountNumber=${buildAccountNumber('999999999')}`,
      headers: { authorization: `Bearer ${alice.token}` },
    });
    expect(unknown.statusCode).toBe(404);
  });

  it('moves ₦500 Alice → Bob as a balanced double-entry pair', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/transfers',
      headers: idempotencyHeaders(alice.token),
      payload: { recipientId: bob.userId, amount: 500, pin: '1234' },
    });
    expect(res.statusCode).toBe(201);
    const receipt = res.json().data as { referenceId: string; balanceKobo: number };
    expect(receipt.balanceKobo).toBe(50000);

    const wallets = db(app).getRepository(Wallet);
    const sender = await wallets.findOneByOrFail({ id: alice.walletId });
    const recipient = await wallets.findOneByOrFail({ id: bob.walletId });
    expect(sender.balanceKobo).toBe(50000);
    expect(recipient.balanceKobo).toBe(50000);

    const legs = await db(app)
      .getRepository(Transaction)
      .findBy({ referenceId: receipt.referenceId });
    expect(legs).toHaveLength(2);
    expect(legs.map((l) => `${l.type}:${l.amount}`).sort()).toEqual([
      'CREDIT:50000',
      'DEBIT:50000',
    ]);
  });

  it('rejects self-transfers and overdrafts with 400', async () => {
    const self = await app.inject({
      method: 'POST',
      url: '/transfers',
      headers: idempotencyHeaders(alice.token),
      payload: { recipientId: alice.userId, amount: 100, pin: '1234' },
    });
    expect(self.statusCode).toBe(400);
    const overdraft = await app.inject({
      method: 'POST',
      url: '/transfers',
      headers: idempotencyHeaders(bob.token),
      payload: { recipientId: alice.userId, amount: 100000, pin: '1234' },
    });
    expect(overdraft.statusCode).toBe(400);
  });
});
