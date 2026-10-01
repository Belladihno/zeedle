import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REDIS_SERVICE, type IRedisService } from '../../core/redis/redis.interface.js';
import { formatNaira, nairaToKobo } from '../../common/utils/money.util.js';
import {
  IDEMPOTENCY_KEY_PREFIX,
  IDEMPOTENCY_TTL_SECONDS,
} from '../../common/middleware/idempotency.middleware.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UsersRepository } from '../users/users.repository.js';
import { WalletsRepository } from '../wallets/wallets.repository.js';
import type { TransferDto } from './dto/transfer.dto.js';
import { TransfersRepository } from './transfers.repository.js';

// No fee policy defined yet — transfers are free, fee stays explicitly zero.
const TRANSFER_FEE_KOBO = 0;

export interface TransferReceipt {
  referenceId: string;
  amountKobo: number;
  feeKobo: number;
  balanceKobo: number;
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly transfers: TransfersRepository,
    private readonly users: UsersRepository,
    private readonly wallets: WalletsRepository,
    private readonly notifications: NotificationsService,
    private readonly db: DataSource,
    @Inject(REDIS_SERVICE) private readonly redis: IRedisService,
  ) {}

  async transfer(
    senderId: string,
    dto: TransferDto,
    idempotencyKey: string | undefined,
  ): Promise<TransferReceipt> {
    // IdempotencyMiddleware normally rejects keyless requests before this runs.
    if (!idempotencyKey) {
      throw new BadRequestException('x-idempotency-key header is required');
    }
    if (dto.recipientId === senderId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }
    await this.users.verifyPin(senderId, dto.pin);
    const recipient = await this.users.findById(dto.recipientId);
    if (!recipient || !recipient.isActive || recipient.isDeleted) {
      throw new NotFoundException('Recipient not found');
    }
    const senderWallet = await this.wallets.findByUserId(senderId);
    const recipientWallet = await this.wallets.findByUserId(recipient.id);

    const queryRunner = this.db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let receipt: TransferReceipt;
    try {
      const executed = await this.transfers.executeTransfer(queryRunner, {
        senderWalletId: senderWallet.id,
        recipientWalletId: recipientWallet.id,
        amountKobo: nairaToKobo(dto.amount),
        feeKobo: TRANSFER_FEE_KOBO,
        narration: dto.narration ?? null,
      });
      await queryRunner.commitTransaction();
      receipt = {
        referenceId: executed.referenceId,
        amountKobo: nairaToKobo(dto.amount),
        feeKobo: TRANSFER_FEE_KOBO,
        balanceKobo: executed.senderBalanceKobo,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
    await this.redis.set(
      `${IDEMPOTENCY_KEY_PREFIX}${idempotencyKey}`,
      JSON.stringify(receipt),
      IDEMPOTENCY_TTL_SECONDS,
    );
    const display = formatNaira(receipt.amountKobo);
    await this.notifications.notify({
      userId: senderId,
      title: 'Transfer sent',
      body: `You sent ${display}.`,
      type: 'DEBIT',
    });
    await this.notifications.notify({
      userId: recipient.id,
      title: 'Transfer received',
      body: `You received ${display}.`,
      type: 'CREDIT',
    });
    return receipt;
  }
}
