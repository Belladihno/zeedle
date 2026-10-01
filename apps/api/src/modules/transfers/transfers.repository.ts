import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Transaction } from '../transactions/entities/transaction.entity.js';
import { Wallet } from '../wallets/entities/wallet.entity.js';

export interface TransferLegs {
  senderWalletId: string;
  recipientWalletId: string;
  amountKobo: number;
  feeKobo: number;
  narration: string | null;
}

export interface ExecutedTransfer {
  referenceId: string;
  senderBalanceKobo: number;
}

/** Double-entry execution — both legs and both records, or nothing. */
@Injectable()
export class TransfersRepository {
  constructor(private readonly db: DataSource) {}

  async executeTransfer(queryRunner: QueryRunner, legs: TransferLegs): Promise<ExecutedTransfer> {
    const wallets = queryRunner.manager.getRepository(Wallet);
    const sender = await wallets.findOne({
      where: { id: legs.senderWalletId },
      lock: { mode: 'pessimistic_write' },
    });
    const recipient = await wallets.findOne({
      where: { id: legs.recipientWalletId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!sender || !recipient) {
      throw new BadRequestException('Wallet not found');
    }
    if (sender.balanceKobo < legs.amountKobo + legs.feeKobo) {
      throw new BadRequestException('Insufficient balance');
    }
    const referenceId = `zeedle_${uuidv7()}`;
    const senderBefore = sender.balanceKobo;
    const recipientBefore = recipient.balanceKobo;
    sender.balanceKobo -= legs.amountKobo + legs.feeKobo;
    recipient.balanceKobo += legs.amountKobo;
    await wallets.save([sender, recipient]);

    const records = queryRunner.manager.getRepository(Transaction);
    await records.save([
      records.create({
        walletId: sender.id,
        type: 'DEBIT',
        status: 'SUCCESS',
        source: 'TRANSFER',
        amount: legs.amountKobo,
        fee: legs.feeKobo,
        balanceBefore: senderBefore,
        balanceAfter: sender.balanceKobo,
        referenceId,
        narration: legs.narration,
        metadata: null,
        settlementId: null,
      }),
      records.create({
        walletId: recipient.id,
        type: 'CREDIT',
        status: 'SUCCESS',
        source: 'TRANSFER',
        amount: legs.amountKobo,
        fee: 0,
        balanceBefore: recipientBefore,
        balanceAfter: recipient.balanceKobo,
        referenceId,
        narration: legs.narration,
        metadata: null,
        settlementId: null,
      }),
    ]);
    return { referenceId, senderBalanceKobo: sender.balanceKobo };
  }
}
