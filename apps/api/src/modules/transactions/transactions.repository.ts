import { Injectable, NotFoundException } from '@nestjs/common';
import { Between, DataSource, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Transaction } from './entities/transaction.entity.js';

export interface TransactionFilter {
  type?: 'CREDIT' | 'DEBIT';
  status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

/** Read-only history — writes happen in payments and transfers. */
@Injectable()
export class TransactionsRepository {
  constructor(private readonly db: DataSource) {}

  async history(
    walletId: string,
    filter: TransactionFilter,
  ): Promise<{ items: Transaction[]; total: number }> {
    const { page, limit, from, to, type, status } = filter;
    const where: Record<string, unknown> = { walletId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (from && to) {
      where.createdAt = Between(new Date(from), new Date(to));
    } else if (from) {
      where.createdAt = MoreThanOrEqual(new Date(from));
    } else if (to) {
      where.createdAt = LessThanOrEqual(new Date(to));
    }
    const [items, total] = await this.db.getRepository(Transaction).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async findByIdForWallet(walletId: string, id: string): Promise<Transaction> {
    const tx = await this.db.getRepository(Transaction).findOneBy({ id, walletId });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    return tx;
  }
}
