import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { WalletsService, type WalletView } from './wallets.service.js';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Get('me')
  getMine(@CurrentUser('sub') userId: string): Promise<WalletView> {
    return this.wallets.getMine(userId);
  }
}
