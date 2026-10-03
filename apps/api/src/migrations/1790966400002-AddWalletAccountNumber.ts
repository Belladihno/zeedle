import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletAccountNumber1790966400002 implements MigrationInterface {
  name = 'AddWalletAccountNumber1790966400002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wallets" ADD "accountNumber" character(10)`);

    // Backfill existing wallets with random valid numbers (9-digit serial +
    // weighted mod-10 check digit, mirroring the shared account-number util).
    // Collision-checked per row; at most a handful of rows exist at migration time.
    await queryRunner.query(`DO $$
DECLARE
  r RECORD;
  serial9 TEXT;
  weights INT[] := ARRAY[3,7,3,3,7,3,3,7,3];
  checksum INT;
  candidate TEXT;
BEGIN
  FOR r IN SELECT id FROM "wallets" WHERE "accountNumber" IS NULL LOOP
    LOOP
      serial9 := lpad((floor(random() * 1000000000))::text, 9, '0');
      checksum := 0;
      FOR i IN 1..9 LOOP
        checksum := checksum + (substring(serial9 FROM i FOR 1))::int * weights[i];
      END LOOP;
      candidate := serial9 || ((10 - (checksum % 10)) % 10)::text;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "wallets" WHERE "accountNumber" = candidate);
    END LOOP;
    UPDATE "wallets" SET "accountNumber" = candidate WHERE id = r.id;
  END LOOP;
END $$`);

    await queryRunner.query(`ALTER TABLE "wallets" ALTER COLUMN "accountNumber" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "UQ_wallets_accountNumber" UNIQUE ("accountNumber")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wallets" DROP CONSTRAINT "UQ_wallets_accountNumber"`);
    await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "accountNumber"`);
  }
}
