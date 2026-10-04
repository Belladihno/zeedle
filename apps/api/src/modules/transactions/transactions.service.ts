import { Injectable } from '@nestjs/common';
import { WalletsRepository } from '../wallets/wallets.repository.js';
import { TransactionsRepository, type TransactionFilter } from './transactions.repository.js';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactions: TransactionsRepository,
    private readonly wallets: WalletsRepository,
  ) {}

  async history(
    userId: string,
    filter: TransactionFilter,
  ): Promise<{ items: unknown; total: number; page: number; limit: number }> {
    const wallet = await this.wallets.findByUserId(userId);
    const { items, total } = await this.transactions.history(wallet.id, filter);
    return { items, total, page: filter.page, limit: filter.limit };
  }

  async findOne(userId: string, id: string): Promise<unknown> {
    const wallet = await this.wallets.findByUserId(userId);
    return this.transactions.findByIdForWallet(wallet.id, id);
  }

  async summary(
    userId: string,
    month?: string,
  ): Promise<{ month: string } & Awaited<ReturnType<TransactionsRepository['summarize']>>> {
    const wallet = await this.wallets.findByUserId(userId);
    const label = month ?? new Date().toISOString().slice(0, 7);
    const [year, mon] = label.split('-').map(Number);
    const from = new Date(Date.UTC(year, mon - 1, 1));
    const to = new Date(Date.UTC(year, mon, 1));
    return { month: label, ...(await this.transactions.summarize(wallet.id, from, to)) };
  }
}
