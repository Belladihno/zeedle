import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isValidAccountNumber } from '@zeedle/shared-types';
import { UsersRepository } from '../users/users.repository.js';
import { AdminRepository, type PlatformMetrics } from './admin.repository.js';
import type { AdminTransactionsQueryDto } from './dto/admin-transactions-query.dto.js';
import type { FreezeWalletDto } from './dto/freeze-wallet.dto.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly admin: AdminRepository,
    private readonly users: UsersRepository,
  ) {}

  metrics(): Promise<PlatformMetrics> {
    return this.admin.platformMetrics();
  }

  async listUsers(
    search: string | undefined,
    page: number,
    limit: number,
  ): Promise<{ items: unknown[]; total: number; page: number; limit: number }> {
    const { items, total } = await this.admin.listUsers(search, page, limit);
    return { items, total, page, limit };
  }

  async resolveAccount(accountNumber: string): Promise<unknown> {
    if (!isValidAccountNumber(accountNumber)) {
      throw new BadRequestException('Invalid Zeedle account number');
    }
    return this.admin.resolveFullByAccountNumber(accountNumber);
  }

  async freezeWallet(
    userId: string,
    adminId: string,
    dto: FreezeWalletDto,
  ): Promise<unknown> {
    const user = await this.users.findById(userId);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }
    const wallet = await this.admin.findWalletByUserId(userId);
    const targetActive = dto.action === 'UNFREEZE';
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    if (wallet.isActive === targetActive) {
      throw new ConflictException(
        targetActive ? 'Wallet is already active' : 'Wallet is already frozen',
      );
    }
    const saved = await this.admin.setWalletActive(
      userId,
      targetActive,
      adminId,
      dto.action === 'FREEZE' ? 'WALLET_FREEZE' : 'WALLET_UNFREEZE',
      dto.reason,
    );
    return {
      userId,
      accountNumber: saved.accountNumber,
      isActive: saved.isActive,
      action: dto.action,
    };
  }

  async transactions(
    filter: AdminTransactionsQueryDto,
  ): Promise<{ items: unknown; total: number; page: number; limit: number }> {
    const { items, total } = await this.admin.platformTransactions(filter);
    return { items, total, page: filter.page, limit: filter.limit };
  }

  async auditLogs(
    page: number,
    limit: number,
  ): Promise<{ items: unknown; total: number; page: number; limit: number }> {
    const { items, total } = await this.admin.listAuditLogs(page, limit);
    return { items, total, page, limit };
  }
}
