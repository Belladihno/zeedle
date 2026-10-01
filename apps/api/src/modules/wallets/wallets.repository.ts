import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Wallet } from './entities/wallet.entity.js';

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
