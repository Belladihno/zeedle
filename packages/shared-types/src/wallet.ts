import { z } from 'zod';

export const FundWalletSchema = z.object({
  amount: z.number().int().min(100).max(10000000),
});
export type FundWalletInput = z.infer<typeof FundWalletSchema>;

export interface WalletDto {
  id: string;
  userId: string;
  balanceKobo: number;
  balanceNaira: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
