import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { IdempotencyMiddleware } from './common/middleware/idempotency.middleware.js';
import { GuardsModule } from './common/guards/guards.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CoreModule } from './core/core.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { SettlementsModule } from './modules/settlements/settlements.module.js';
import { TransactionsModule } from './modules/transactions/transactions.module.js';
import { TransfersModule } from './modules/transfers/transfers.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WalletsModule } from './modules/wallets/wallets.module.js';

@Module({
  imports: [
    CoreModule,
    GuardsModule,
    AuthModule,
    UsersModule,
    WalletsModule,
    PaymentsModule,
    TransfersModule,
    TransactionsModule,
    SettlementsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, IdempotencyMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer
      .apply(IdempotencyMiddleware)
      .forRoutes(
        { path: 'transfers', method: RequestMethod.POST },
        { path: 'payments/fund/initialize', method: RequestMethod.POST },
      );
  }
}
