import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { UsersModule } from '../users/users.module.js';
import { WalletsModule } from '../wallets/wallets.module.js';
import { TransfersController } from './transfers.controller.js';
import { TransfersRepository } from './transfers.repository.js';
import { TransfersService } from './transfers.service.js';

@Module({
  imports: [WalletsModule, UsersModule, NotificationsModule],
  controllers: [TransfersController],
  providers: [TransfersService, TransfersRepository],
})
export class TransfersModule {}
