import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashSecret } from '../../infrastructure/encryption/bcrypt.helper.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async getProfile(userId: string): Promise<unknown> {
    const user = await this.users.findById(userId);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async resolveRecipient(id: string): Promise<unknown> {
    const user = await this.users.findPublicById(id);
    if (!user) {
      throw new NotFoundException('Recipient not found');
    }
    return user;
  }

  updateProfile(
    userId: string,
    patch: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<unknown> {
    return this.users.updateProfile(userId, patch);
  }

  async createPin(userId: string, pin: string): Promise<{ message: string }> {
    if (await this.users.findPinByUserId(userId)) {
      throw new ConflictException('Transaction PIN already set');
    }
    await this.users.createPin(userId, await hashSecret(pin));
    return { message: 'Transaction PIN set' };
  }

  async changePin(userId: string, currentPin: string, newPin: string): Promise<{ message: string }> {
    await this.users.verifyPin(userId, currentPin);
    await this.users.updatePinHash(userId, await hashSecret(newPin));
    return { message: 'Transaction PIN changed' };
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    await this.users.anonymiseAccount(userId);
    return { message: 'Account deleted' };
  }
}
