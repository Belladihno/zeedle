import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Settlement } from './entities/settlement.entity.js';
import { Transaction } from '../transactions/entities/transaction.entity.js';


@Injectable()
export class SettlementsRepository {
  constructor(private readonly db: DataSource) {}

  async unsettledAggregate(from: Date, to: Date): Promise<{ totalAmount: number; count: number }> {
    const row = await this.db
      .getRepository(Transaction)
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount), 0)', 'total')
      .addSelect('COUNT(tx.id)', 'count')
      .where('tx.type = :type', { type: 'CREDIT' })
      .andWhere('tx.status = :status', { status: 'SUCCESS' })
      .andWhere('tx.settlementId IS NULL')
      .andWhere('tx.createdAt BETWEEN :from AND :to', { from, to })
      .getRawOne<{ total: string; count: string }>();
    return { totalAmount: Number(row?.total ?? 0), count: Number(row?.count ?? 0) };
  }

  createBatch(
    queryRunner: QueryRunner,
    data: { periodStart: Date; periodEnd: Date; triggeredBy: string },
  ): Promise<Settlement> {
    const repo = queryRunner.manager.getRepository(Settlement);
    return repo.save(repo.create({ ...data, totalAmount: 0, transactionCount: 0 }));
  }

  async assignBatch(
    queryRunner: QueryRunner,
    batchId: string,
    from: Date,
    to: Date,
  ): Promise<void> {
    await queryRunner.manager
      .createQueryBuilder()
      .update(Transaction)
      .set({ settlementId: batchId })
      .where('type = :type', { type: 'CREDIT' })
      .andWhere('status = :status', { status: 'SUCCESS' })
      .andWhere('settlementId IS NULL')
      .andWhere('createdAt BETWEEN :from AND :to', { from, to })
      .execute();
  }

  async completeBatch(
    queryRunner: QueryRunner,
    batchId: string,
    totalAmount: number,
    transactionCount: number,
  ): Promise<Settlement> {
    const repo = queryRunner.manager.getRepository(Settlement);
    const batch = await repo.findOneByOrFail({ id: batchId });
    batch.totalAmount = totalAmount;
    batch.transactionCount = transactionCount;
    batch.status = 'COMPLETED';
    batch.completedAt = new Date();
    return repo.save(batch);
  }

  async history(
    page: number,
    limit: number,
  ): Promise<{ items: Settlement[]; total: number }> {
    const [items, total] = await this.db.getRepository(Settlement).findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }
}
