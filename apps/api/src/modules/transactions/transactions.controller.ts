import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TransactionQueryDto } from './dto/transaction-query.dto.js';
import { TransactionsService } from './transactions.service.js';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  history(
    @CurrentUser('sub') userId: string,
    @Query() query: TransactionQueryDto,
  ): Promise<unknown> {
    return this.transactions.history(userId, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    return this.transactions.findOne(userId, id);
  }
}
