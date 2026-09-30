import { z } from 'zod';

export const TransferSchema = z.object({
  recipientId: z.uuid(),
  amount: z.number().int().min(100).max(10000000),
  pin: z.string().regex(/^\d{4}$/),
  narration: z.string().trim().max(140).optional(),
});
export type TransferInput = z.infer<typeof TransferSchema>;
