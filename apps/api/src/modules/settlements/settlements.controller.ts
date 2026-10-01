import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { RunSettlementDto } from './dto/run-settlement.dto.js';
import { SettlementsService, type SettlementSummary } from './settlements.service.js';

@Controller('settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SettlementsController {
  constructor(private readonly settlements: SettlementsService) {}

  @Post('run')
  run(
    @CurrentUser('sub') adminId: string,
    @Body() dto: RunSettlementDto,
  ): Promise<SettlementSummary> {
    return this.settlements.run(adminId, dto.periodStart, dto.periodEnd);
  }

  @Get()
  history(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<unknown> {
    return this.settlements.history(page, Math.min(limit, 100));
  }
}
