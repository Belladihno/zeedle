import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Transaction } from '../transactions/entities/transaction.entity.js';
import { User } from '../users/entities/user.entity.js';

export interface FundingRecord {
  walletId: string;
  amountKobo: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string;
  externalReference: string;
}


@Injectable()
export class PaymentsRepository {
  constructor(private readonly db: DataSource) {}

  findUserByEmail(email: string): Promise<User | null> {
    return this.db.getRepository(User).findOneBy({ email });
  }

  findByReferenceId(referenceId: string): Promise<Transaction | null> {
    return this.db
      .getRepository(Transaction)
      .findOneBy({ referenceId, source: 'PAYSTACK' });
  }

  createTransaction(queryRunner: QueryRunner, record: FundingRecord): Promise<Transaction> {
    const repo = queryRunner.manager.getRepository(Transaction);
    return repo.save(
      repo.create({
        walletId: record.walletId,
        type: 'CREDIT',
        status: 'SUCCESS',
        source: 'PAYSTACK',
        amount: record.amountKobo,
        fee: 0,
        balanceBefore: record.balanceBefore,
        balanceAfter: record.balanceAfter,
        referenceId: record.referenceId,
        externalReference: record.externalReference,
        narration: 'Wallet funding via Paystack',
        metadata: null,
        settlementId: null,
      }),
    );
  }
}
