import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1791052800003 implements MigrationInterface {
  name = 'CreateAuditLogs1791052800003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "audit_logs" (
      "id" uuid NOT NULL PRIMARY KEY,
      "actorId" uuid NOT NULL,
      "action" character varying NOT NULL,
      "targetType" character varying NOT NULL,
      "targetId" character varying NOT NULL,
      "reason" character varying NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_actorId" ON "audit_logs" ("actorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_actorId"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
