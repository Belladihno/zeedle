import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { compareSecret } from '../../infrastructure/encryption/bcrypt.helper.js';
import { RefreshToken } from '../auth/entities/refresh-token.entity.js';
import { TransactionPin } from './entities/transaction-pin.entity.js';
import { User } from './entities/user.entity.js';

const MAX_PIN_ATTEMPTS = 3;
const LOCK_MINUTES = 30;

/** All user persistence, including PIN verification with lockout. */
@Injectable()
export class UsersRepository {
  constructor(private readonly db: DataSource) {}

  findById(id: string): Promise<User | null> {
    return this.db.getRepository(User).findOneBy({ id });
  }

  /** Public profile for transfer recipient lookup — name only, never contact data. */
  async findPublicById(id: string): Promise<Pick<User, 'id' | 'firstName' | 'lastName'> | null> {
    return this.db.getRepository(User).findOne({
      where: { id, isActive: true, isDeleted: false },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  async updateProfile(
    id: string,
    patch: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<User> {
    const repo = this.db.getRepository(User);
    await repo.update({ id }, patch);
    const updated = await repo.findOneBy({ id });
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  findPinByUserId(userId: string): Promise<TransactionPin | null> {
    return this.db.getRepository(TransactionPin).findOneBy({ userId });
  }

  async createPin(userId: string, pinHash: string): Promise<TransactionPin> {
    const repo = this.db.getRepository(TransactionPin);
    return repo.save(repo.create({ userId, pinHash }));
  }

  /** Throws 423 when locked, 401 with remaining attempts on mismatch. */
  async verifyPin(userId: string, pin: string): Promise<void> {
    const repo = this.db.getRepository(TransactionPin);
    const record = await repo.findOneBy({ userId });
    if (!record) {
      throw new BadRequestException('No transaction PIN set');
    }
    if (record.lockedUntil && record.lockedUntil > new Date()) {
      throw new HttpException('PIN locked. Try again later.', HttpStatus.LOCKED);
    }
    if (await compareSecret(pin, record.pinHash)) {
      record.failedAttempts = 0;
      record.lockedUntil = null;
      await repo.save(record);
      return;
    }
    record.failedAttempts += 1;
    if (record.failedAttempts >= MAX_PIN_ATTEMPTS) {
      record.failedAttempts = 0;
      record.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      await repo.save(record);
      throw new HttpException('Too many attempts. PIN locked for 30 minutes.', HttpStatus.LOCKED);
    }
    await repo.save(record);
    const remaining = MAX_PIN_ATTEMPTS - record.failedAttempts;
    throw new UnauthorizedException(`Incorrect PIN. ${remaining} attempts remaining.`);
  }

  async updatePinHash(userId: string, pinHash: string): Promise<void> {
    await this.db
      .getRepository(TransactionPin)
      .update({ userId }, { pinHash, failedAttempts: 0, lockedUntil: null });
  }

  /** NDPA erasure with financial override: PII anonymised, records retained. */
  async anonymiseAccount(userId: string): Promise<void> {
    const queryRunner = this.db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.update(
        User,
        { id: userId },
        {
          email: `deleted_${uuidv7()}@zeedle.invalid`,
          firstName: 'Deleted',
          lastName: 'User',
          phone: null,
          isActive: false,
          isDeleted: true,
          deletedAt: new Date(),
        },
      );
      await queryRunner.manager.update(
        RefreshToken,
        { userId },
        { isRevoked: true },
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
