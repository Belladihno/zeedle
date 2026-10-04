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

export interface MonthSummary {
  inflowKobo: number;
  outflowKobo: number;
  inflowCount: number;
  outflowCount: number;
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

  /**
   * Monthly inflow/outflow totals over settled transactions.
   * One grouped query — the dashboard must not page through history to sum two numbers.
   */
  async summarize(walletId: string, from: Date, to: Date): Promise<MonthSummary> {
    const rows = await this.db
      .getRepository(Transaction)
      .createQueryBuilder('tx')
      .select('tx.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'total')
      .where('tx.walletId = :walletId', { walletId })
      .andWhere('tx.status = :status', { status: 'SUCCESS' })
      .andWhere('tx.createdAt >= :from', { from })
      .andWhere('tx.createdAt < :to', { to })
      .groupBy('tx.type')
      .getRawMany<{ type: string; count: string; total: string }>();
    const summary: MonthSummary = { inflowKobo: 0, outflowKobo: 0, inflowCount: 0, outflowCount: 0 };
    for (const row of rows) {
      if (row.type === 'CREDIT') {
        summary.inflowKobo = Number(row.total);
        summary.inflowCount = Number(row.count);
      } else if (row.type === 'DEBIT') {
        summary.outflowKobo = Number(row.total);
        summary.outflowCount = Number(row.count);
      }
    }
    return summary;
  }
}
