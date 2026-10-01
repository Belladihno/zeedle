import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TransferDto } from './dto/transfer.dto.js';
import { TransfersService, type TransferReceipt } from './transfers.service.js';

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Post()
  send(
    @CurrentUser('sub') senderId: string,
    @Body() dto: TransferDto,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
  ): Promise<TransferReceipt> {
    return this.transfers.transfer(senderId, dto, idempotencyKey);
  }
}
