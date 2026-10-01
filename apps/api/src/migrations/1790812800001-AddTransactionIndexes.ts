import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionIndexes1790812800001 implements MigrationInterface {
  name = 'AddTransactionIndexes1790812800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_walletId" ON "transactions" ("walletId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_referenceId" ON "transactions" ("referenceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_createdAt" ON "transactions" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_status_settlementId" ON "transactions" ("status", "settlementId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_transactions_status_settlementId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_transactions_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_transactions_referenceId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_transactions_walletId"`);
  }
}
