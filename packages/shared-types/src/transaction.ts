import { z } from 'zod';
import type {
  SettlementStatus,
  TransactionSource,
  TransactionStatus,
  TransactionType,
} from './enums.js';

export interface TransactionDto {
  id: string;
  walletId: string;
  type: TransactionType;
  status: TransactionStatus;
  source: TransactionSource;
  amount: number;
  fee: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string;
  externalReference: string | null;
  narration: string | null;
  settlementId: string | null;
  createdAt: string;
}

export const TransactionQuerySchema = z.object({
  type: z.enum(['CREDIT', 'DEBIT']).optional(),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'REVERSED']).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type TransactionQuery = z.infer<typeof TransactionQuerySchema>;

export const TransactionSummaryQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM')
    .optional(),
});
export type TransactionSummaryQuery = z.infer<typeof TransactionSummaryQuerySchema>;

export interface TransactionSummaryDto {
  month: string;
  inflowKobo: number;
  outflowKobo: number;
  inflowCount: number;
  outflowCount: number;
}

export const RunSettlementSchema = z.object({
  periodStart: z.iso.datetime(),
  periodEnd: z.iso.datetime(),
});
export type RunSettlementInput = z.infer<typeof RunSettlementSchema>;

export interface SettlementDto {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  transactionCount: number;
  status: SettlementStatus;
  triggeredBy: string;
  createdAt: string;
  completedAt: string | null;
}
