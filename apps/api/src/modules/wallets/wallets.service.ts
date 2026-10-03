import { Injectable } from '@nestjs/common';
import { formatNaira } from '../../common/utils/money.util.js';
import { WalletsRepository } from './wallets.repository.js';

export interface WalletView {
  id: string;
  accountNumber: string;
  balanceKobo: number;
  balanceNaira: string;
  currency: string;
  isActive: boolean;
}

@Injectable()
export class WalletsService {
  constructor(private readonly wallets: WalletsRepository) {}

  async getMine(userId: string): Promise<WalletView> {
    const wallet = await this.wallets.findByUserId(userId);
    return {
      id: wallet.id,
      accountNumber: wallet.accountNumber,
      balanceKobo: wallet.balanceKobo,
      balanceNaira: formatNaira(wallet.balanceKobo),
      currency: wallet.currency,
      isActive: wallet.isActive,
    };
  }
}
