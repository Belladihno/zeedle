import { Injectable, NotFoundException } from '@nestjs/common';
import { generateAccountNumberCandidate } from '@zeedle/shared-types';
import { DataSource, QueryRunner } from 'typeorm';
import { Wallet } from './entities/wallet.entity.js';

const MAX_ACCOUNT_NUMBER_ATTEMPTS = 5;

/** Wallet data access. updateBalance never opens its own transaction. */
@Injectable()
export class WalletsRepository {
  constructor(private readonly db: DataSource) {}

  async findByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.db.getRepository(Wallet).findOneBy({ userId });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  async findByAccountNumber(accountNumber: string): Promise<Wallet | null> {
    return this.db.getRepository(Wallet).findOneBy({ accountNumber });
  }

  /**
   * Creates a wallet with a unique random 10-digit account number.
   * Uniqueness is enforced by the DB constraint — on collision (23505) the
   * attempt is rolled back to a savepoint (a Postgres error otherwise poisons
   * the whole transaction) and a fresh candidate is tried.
   */
  async createForUser(queryRunner: QueryRunner, userId: string): Promise<Wallet> {
    const repo = queryRunner.manager.getRepository(Wallet);
    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_ACCOUNT_NUMBER_ATTEMPTS; attempt += 1) {
      await queryRunner.query('SAVEPOINT zeedle_acct_sp');
      try {
        return await repo.save(
          repo.create({
            userId,
            balanceKobo: 0,
            accountNumber: generateAccountNumberCandidate(),
          }),
        );
      } catch (error) {
        if ((error as { code?: string })?.code !== '23505') {
          throw error;
        }
        await queryRunner.query('ROLLBACK TO SAVEPOINT zeedle_acct_sp');
        lastError = error;
      }
    }
    throw lastError;
  }

  /** Adjusts the balance under a row lock. The caller owns the transaction. */
  async updateBalance(
    queryRunner: QueryRunner,
    walletId: string,
    deltaKobo: number,
  ): Promise<Wallet> {
    const repo = queryRunner.manager.getRepository(Wallet);
    const wallet = await repo.findOne({
      where: { id: walletId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    wallet.balanceKobo += deltaKobo;
    return repo.save(wallet);
  }
}
