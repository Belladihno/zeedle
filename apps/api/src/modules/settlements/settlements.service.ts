import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SettlementsRepository } from './settlements.repository.js';

export interface SettlementSummary {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  transactionCount: number;
  status: string;
}

@Injectable()
export class SettlementsService {
  constructor(
    private readonly settlements: SettlementsRepository,
    private readonly db: DataSource,
  ) {}

  async run(adminId: string, periodStart: string, periodEnd: string): Promise<SettlementSummary> {
    const from = new Date(periodStart);
    const to = new Date(periodEnd);
    const { totalAmount, count } = await this.settlements.unsettledAggregate(from, to);
    if (count === 0) {
      throw new BadRequestException('No unsettled transactions in range');
    }
    const queryRunner = this.db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const batch = await this.settlements.createBatch(queryRunner, {
        periodStart: from,
        periodEnd: to,
        triggeredBy: adminId,
      });
      await this.settlements.assignBatch(queryRunner, batch.id, from, to);
      const completed = await this.settlements.completeBatch(
        queryRunner,
        batch.id,
        totalAmount,
        count,
      );
      await queryRunner.commitTransaction();
      return {
        id: completed.id,
        periodStart: completed.periodStart,
        periodEnd: completed.periodEnd,
        totalAmount: completed.totalAmount,
        transactionCount: completed.transactionCount,
        status: completed.status,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async history(
    page: number,
    limit: number,
  ): Promise<{ items: unknown; total: number; page: number; limit: number }> {
    const { items, total } = await this.settlements.history(page, limit);
    return { items, total, page, limit };
  }
}
