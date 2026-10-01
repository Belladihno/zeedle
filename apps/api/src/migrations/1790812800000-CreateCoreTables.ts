import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoreTables1790812800000 implements MigrationInterface {
  name = 'CreateCoreTables1790812800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('USER', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_type_enum" AS ENUM('CREDIT', 'DEBIT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_status_enum" AS ENUM('PENDING', 'SUCCESS', 'FAILED', 'REVERSED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_source_enum" AS ENUM('PAYSTACK', 'TRANSFER', 'SYSTEM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."settlements_status_enum" AS ENUM('PENDING', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('CREDIT', 'DEBIT', 'SYSTEM')`,
    );

    await queryRunner.query(`CREATE TABLE "users" (
      "id" uuid NOT NULL PRIMARY KEY,
      "email" character varying NOT NULL UNIQUE,
      "firstName" character varying NOT NULL,
      "lastName" character varying NOT NULL,
      "phone" character varying,
      "passwordHash" character varying NOT NULL,
      "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER',
      "isActive" boolean NOT NULL DEFAULT true,
      "isDeleted" boolean NOT NULL DEFAULT false,
      "deletedAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )`);

    await queryRunner.query(`CREATE TABLE "transaction_pins" (
      "id" uuid NOT NULL PRIMARY KEY,
      "userId" uuid NOT NULL UNIQUE,
      "pinHash" character varying NOT NULL,
      "failedAttempts" integer NOT NULL DEFAULT 0,
      "lockedUntil" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "FK_transaction_pins_userId" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE "wallets" (
      "id" uuid NOT NULL PRIMARY KEY,
      "userId" uuid NOT NULL UNIQUE,
      "balanceKobo" bigint NOT NULL DEFAULT 0,
      "currency" character varying NOT NULL DEFAULT 'NGN',
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "FK_wallets_userId" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE "settlements" (
      "id" uuid NOT NULL PRIMARY KEY,
      "periodStart" TIMESTAMP WITH TIME ZONE NOT NULL,
      "periodEnd" TIMESTAMP WITH TIME ZONE NOT NULL,
      "totalAmount" bigint NOT NULL DEFAULT 0,
      "transactionCount" integer NOT NULL DEFAULT 0,
      "status" "public"."settlements_status_enum" NOT NULL DEFAULT 'PENDING',
      "triggeredBy" uuid NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "completedAt" TIMESTAMP WITH TIME ZONE,
      CONSTRAINT "FK_settlements_triggeredBy" FOREIGN KEY ("triggeredBy")
        REFERENCES "users"("id") ON DELETE NO ACTION
    )`);

    await queryRunner.query(`CREATE TABLE "transactions" (
      "id" uuid NOT NULL PRIMARY KEY,
      "walletId" uuid NOT NULL,
      "type" "public"."transactions_type_enum" NOT NULL,
      "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'PENDING',
      "source" "public"."transactions_source_enum" NOT NULL,
      "amount" bigint NOT NULL,
      "fee" bigint NOT NULL DEFAULT 0,
      "balanceBefore" bigint NOT NULL,
      "balanceAfter" bigint NOT NULL,
      "referenceId" character varying NOT NULL,
      "externalReference" character varying,
      "narration" character varying,
      "metadata" jsonb,
      "settlementId" uuid,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "FK_transactions_walletId" FOREIGN KEY ("walletId")
        REFERENCES "wallets"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_transactions_settlementId" FOREIGN KEY ("settlementId")
        REFERENCES "settlements"("id") ON DELETE NO ACTION
    )`);

    await queryRunner.query(`CREATE TABLE "notifications" (
      "id" uuid NOT NULL PRIMARY KEY,
      "userId" uuid NOT NULL,
      "title" character varying NOT NULL,
      "body" character varying NOT NULL,
      "type" "public"."notifications_type_enum" NOT NULL,
      "isRead" boolean NOT NULL DEFAULT false,
      "relatedTransactionId" uuid,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "FK_notifications_userId" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE "refresh_tokens" (
      "id" uuid NOT NULL PRIMARY KEY,
      "userId" uuid NOT NULL,
      "tokenHash" character varying NOT NULL,
      "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "isRevoked" boolean NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "FK_refresh_tokens_userId" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TABLE "settlements"`);
    await queryRunner.query(`DROP TABLE "wallets"`);
    await queryRunner.query(`DROP TABLE "transaction_pins"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."settlements_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_source_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
