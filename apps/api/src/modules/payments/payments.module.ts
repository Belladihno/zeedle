import { Module } from '@nestjs/common';
import { PaystackClient } from '../../infrastructure/paystack/paystack.client.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { UsersModule } from '../users/users.module.js';
import { WalletsModule } from '../wallets/wallets.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsRepository } from './payments.repository.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [WalletsModule, NotificationsModule, UsersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, PaystackClient],
})
export class PaymentsModule {}
