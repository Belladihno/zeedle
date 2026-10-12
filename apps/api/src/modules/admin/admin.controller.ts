import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AdminService } from './admin.service.js';
import { AdminTransactionsQueryDto } from './dto/admin-transactions-query.dto.js';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto.js';
import { FreezeWalletDto } from './dto/freeze-wallet.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('metrics')
  metrics(): Promise<unknown> {
    return this.admin.metrics();
  }

  @Get('users')
  listUsers(@Query() query: AdminUsersQueryDto): Promise<unknown> {
    return this.admin.listUsers(query.search, query.page, query.limit);
  }

  @Get('users/resolve')
  resolveAccount(@Query('accountNumber') accountNumber: string): Promise<unknown> {
    return this.admin.resolveAccount(accountNumber);
  }

  @Patch('users/:id/wallet')
  freezeWallet(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Body() dto: FreezeWalletDto,
  ): Promise<unknown> {
    return this.admin.freezeWallet(id, adminId, dto);
  }

  @Get('transactions')
  transactions(@Query() query: AdminTransactionsQueryDto): Promise<unknown> {
    return this.admin.transactions(query);
  }

  @Get('audit-logs')
  auditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<unknown> {
    return this.admin.auditLogs(page, Math.min(limit, 100));
  }
}
