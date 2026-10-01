import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { FundWalletDto } from './dto/fund-wallet.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('fund/initialize')
  @UseGuards(JwtAuthGuard)
  initializeFunding(
    @CurrentUser('sub') userId: string,
    @Body() dto: FundWalletDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ): Promise<{ checkoutUrl: string; reference: string }> {
    return this.payments.initializeFunding(userId, dto.amount, idempotencyKey);
  }

  @Post('webhook')
  handleWebhook(
    @Req() req: FastifyRequest & { rawBody?: string },
    @Headers('x-paystack-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    return this.payments.handleWebhook(req.rawBody ?? '', signature);
  }
}
