import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, IsNull, Not } from 'typeorm';
import { Settlement } from '../settlements/entities/settlement.entity.js';
import { Transaction } from '../transactions/entities/transaction.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Wallet } from '../wallets/entities/wallet.entity.js';
import { AuditLog, type AuditAction } from './entities/audit-log.entity.js';
import type { AdminTransactionsQueryDto } from './dto/admin-transactions-query.dto.js';

export interface PlatformMetrics {
  users: number;
  activeWallets: number;
  frozenWallets: number;
  unsettledKobo: number;
  unsettledCount: number;
  settledVolumeKobo: number;
  settlementCount: number;
}

/** ADMIN-only data access. Contact data returned here never leaves the admin boundary. */
@Injectable()
export class AdminRepository {
  constructor(private readonly db: DataSource) {}

  async platformMetrics(): Promise<PlatformMetrics> {
    const users = this.db.getRepository(User).countBy({ isDeleted: false });
    const activeWallets = this.db.getRepository(Wallet).countBy({ isActive: true });
    const frozenWallets = this.db.getRepository(Wallet).countBy({ isActive: false });
    const unsettled = this.db
      .getRepository(Transaction)
      .createQueryBuilder('tx')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'total')
      .where('tx.status = :status', { status: 'SUCCESS' })
      .andWhere('tx.settlementId IS NULL')
      .getRawOne<{ count: string; total: string }>();
    const settled = this.db
      .getRepository(Settlement)
      .createQueryBuilder('s')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(s.totalAmount), 0)', 'total')
      .getRawOne<{ count: string; total: string }>();
    const [userCount, active, frozen, open, done] = await Promise.all([
      users,
      activeWallets,
      frozenWallets,
      unsettled,
      settled,
    ]);
    return {
      users: userCount,
      activeWallets: active,
      frozenWallets: frozen,
      unsettledKobo: Number(open?.total ?? 0),
      unsettledCount: Number(open?.count ?? 0),
      settledVolumeKobo: Number(done?.total ?? 0),
      settlementCount: Number(done?.count ?? 0),
    };
  }

  async listUsers(
    search: string | undefined,
    page: number,
    limit: number,
  ): Promise<{ items: unknown[]; total: number }> {
    const qb = this.db
      .getRepository(User)
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.wallet', 'wallet')
      .where('u.isDeleted = false')
      .select([
        'u.id',
        'u.email',
        'u.firstName',
        'u.lastName',
        'u.phone',
        'u.role',
        'u.isActive',
        'u.isDeleted',
        'u.createdAt',
        'wallet',
      ])
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      qb.andWhere(
        '(u.email ILIKE :term OR u.firstName ILIKE :term OR u.lastName ILIKE :term OR wallet.accountNumber ILIKE :term)',
        { term },
      );
    }
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /** Full profile + wallet for support. ADMIN eyes only — includes contact data. */
  async resolveFullByAccountNumber(accountNumber: string): Promise<unknown> {
    const wallet = await this.db.getRepository(Wallet).findOne({
      where: { accountNumber },
      relations: { user: true },
    });
    if (!wallet || !wallet.user || wallet.user.isDeleted) {
      throw new NotFoundException('Account not found');
    }
    // Explicit allowlist: passwordHash can never leak through this path.
    const u = wallet.user;
    const user = {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      isDeleted: u.isDeleted,
      createdAt: u.createdAt,
    };
    return { user, wallet };
  }

  async findWalletByUserId(userId: string): Promise<Wallet | null> {
    return this.db.getRepository(Wallet).findOneBy({ userId });
  }

  /**
   * Freezes/unfreezes a wallet and records the audit entry atomically.
   * Enforcement happens in the transfer and funding paths, not here.
   */
  async setWalletActive(
    userId: string,
    isActive: boolean,
    actorId: string,
    action: AuditAction,
    reason: string,
  ): Promise<Wallet> {
    const queryRunner = this.db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const wallet = await queryRunner.manager
        .getRepository(Wallet)
        .findOneBy({ userId });
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }
      wallet.isActive = isActive;
      const saved = await queryRunner.manager.getRepository(Wallet).save(wallet);
      await queryRunner.manager.getRepository(AuditLog).save(
        queryRunner.manager.getRepository(AuditLog).create({
          actorId,
          action,
          targetType: 'wallet',
          targetId: wallet.id,
          reason,
        }),
      );
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async platformTransactions(
    filter: AdminTransactionsQueryDto,
  ): Promise<{ items: Transaction[]; total: number }> {
    const { page, limit, type, status, settled, from, to } = filter;
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (settled === 'SETTLED') where.settlementId = Not(IsNull());
    if (settled === 'UNSETTLED') where.settlementId = IsNull();
    const repo = this.db.getRepository(Transaction);
    const qb = repo.createQueryBuilder('tx').where(where);
    if (from && to) {
      qb.andWhere('tx.createdAt BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) });
    } else if (from) {
      qb.andWhere('tx.createdAt >= :from', { from: new Date(from) });
    } else if (to) {
      qb.andWhere('tx.createdAt <= :to', { to: new Date(to) });
    }
    qb.orderBy('tx.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async writeAudit(
    actorId: string,
    action: AuditAction,
    targetType: string,
    targetId: string,
    reason: string,
  ): Promise<AuditLog> {
    const repo = this.db.getRepository(AuditLog);
    return repo.save(repo.create({ actorId, action, targetType, targetId, reason }));
  }

  async listAuditLogs(
    page: number,
    limit: number,
  ): Promise<{ items: AuditLog[]; total: number }> {
    const [items, total] = await this.db.getRepository(AuditLog).findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }
}
