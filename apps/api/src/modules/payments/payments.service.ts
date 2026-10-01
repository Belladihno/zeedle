import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { DataSource } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { nairaToKobo } from '../../common/utils/money.util.js';
import { PaystackClient, type PaystackWebhookData } from '../../infrastructure/paystack/paystack.client.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UsersRepository } from '../users/users.repository.js';
import { WalletsRepository } from '../wallets/wallets.repository.js';
import { PaymentsRepository } from './payments.repository.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly payments: PaymentsRepository,
    private readonly users: UsersRepository,
    private readonly wallets: WalletsRepository,
    private readonly notifications: NotificationsService,
    private readonly paystack: PaystackClient,
    private readonly config: ConfigService,
    private readonly db: DataSource,
  ) {}

  async initializeFunding(
    userId: string,
    amountNaira: number,
  ): Promise<{ checkoutUrl: string; reference: string }> {
    const user = await this.users.findById(userId);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }
    const reference = `zeedle_${uuidv7()}`;
    const session = await this.paystack.initializeTransaction(
      user.email,
      nairaToKobo(amountNaira),
      reference,
    );
    return { checkoutUrl: session.authorization_url, reference };
  }

  /** Verifies HMAC-SHA512, then credits the wallet exactly once per reference. */
  async handleWebhook(rawBody: string, signature: string | undefined): Promise<{ received: boolean }> {
    if (!signature || !this.isValidSignature(rawBody, signature)) {
      this.logger.warn('Rejected Paystack webhook: invalid signature');
      throw new BadRequestException('Invalid webhook signature');
    }
    const event = JSON.parse(rawBody) as { event: string; data: PaystackWebhookData };
    this.logger.log(`Paystack webhook verified: event=${event.event}`);
    if (event.event !== 'charge.success') {
      return { received: true };
    }
    const { reference, amount, customer, id } = event.data;
    if (await this.payments.findByReferenceId(reference)) {
      this.logger.log(`Webhook already processed: reference=${reference}`);
      return { received: true };
    }
    const user = await this.payments.findUserByEmail(customer.email);
    if (!user || user.isDeleted) {
      this.logger.warn(`Webhook for unknown user: ${customer.email}`);
      throw new BadRequestException('Unknown customer');
    }
    const queryRunner = this.db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const wallet = await this.wallets.findByUserId(user.id);
      const balanceBefore = wallet.balanceKobo;
      await this.wallets.updateBalance(queryRunner, wallet.id, amount);
      await this.payments.createTransaction(queryRunner, {
        walletId: wallet.id,
        amountKobo: amount,
        balanceBefore,
        balanceAfter: balanceBefore + amount,
        referenceId: reference,
        externalReference: String(id),
      });
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
    await this.notifications.notify({
      userId: user.id,
      title: 'Wallet funded',
      body: `Your wallet was credited.`,
      type: 'CREDIT',
    });
    this.logger.log(`Wallet credited: userId=${user.id} amountKobo=${amount} reference=${reference}`);
    return { received: true };
  }

  private isValidSignature(rawBody: string, signature: string): boolean {
    const secret = this.config.getOrThrow<string>('PAYSTACK_SECRET');
    const digest = createHmac('sha512', secret).update(rawBody).digest('hex');
    if (digest.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  }
}
