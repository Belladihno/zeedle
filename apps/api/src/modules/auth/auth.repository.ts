import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WalletsRepository } from '../wallets/wallets.repository.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Wallet } from '../wallets/entities/wallet.entity.js';

export interface NewAccount {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
}


@Injectable()
export class AuthRepository {
  constructor(
    private readonly db: DataSource,
    private readonly wallets: WalletsRepository,
  ) {}

  findUserByEmail(email: string): Promise<User | null> {
    return this.db.getRepository(User).findOneBy({ email });
  }
  
  findUserById(id: string): Promise<User | null> {
    return this.db.getRepository(User).findOneBy({ id });
  }
  
  async createUserAndWallet(data: NewAccount): Promise<{ user: User; wallet: Wallet }> {
    const queryRunner = this.db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const user = await queryRunner.manager.save(
        queryRunner.manager.create(User, { ...data, role: 'USER' as const }),
      );
      const wallet = await this.wallets.createForUser(queryRunner, user.id);
      await queryRunner.commitTransaction();
      return { user, wallet };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken> {
    const repo = this.db.getRepository(RefreshToken);
    return repo.save(repo.create({ userId, tokenHash, expiresAt }));
  }

  findRefreshTokenById(id: string): Promise<RefreshToken | null> {
    return this.db.getRepository(RefreshToken).findOneBy({ id });
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await this.db.getRepository(RefreshToken).update({ id }, { isRevoked: true });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db.getRepository(RefreshToken).update({ userId }, { isRevoked: true });
  }
}
