import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  TransactionDto,
  TransactionSummaryDto,
  UserDto,
  WalletDto,
} from '@zeedle/shared-types';
import { isValidAccountNumber } from '@zeedle/shared-types';
import { useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () => apiGet<WalletDto>('wallets/me'),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useRecentTransactions() {
  return useQuery({
    queryKey: ['transactions', { limit: 5 }],
    queryFn: () => apiGet<Page<TransactionDto>>('transactions?limit=5'),
    staleTime: 120_000,
  });
}

export function useTransactionHistory(filters: Record<string, string | number>) {  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => {
      const params = new URLSearchParams(
        Object.entries(filters).map(([k, v]) => [k, String(v)]),
      );
      return apiGet<Page<TransactionDto>>(`transactions?${params}`);
    },
    staleTime: 120_000,
    placeholderData: (previous) => previous,
  });
}

/** Monthly inflow/outflow totals — one light query, no history paging. */
export function useTransactionSummary(month: string) {
  return useQuery({
    queryKey: ['transactions', 'summary', month],
    queryFn: () => apiGet<TransactionSummaryDto>(`transactions/summary?month=${month}`),
    staleTime: 60_000,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      apiGet<{ items: unknown[]; total: number; unread: number }>('notifications?limit=20'),
    staleTime: 60_000,
  });
}

export interface ResolvedRecipient {
  found: boolean;
  name: string;
  userId?: string;
  accountNumber?: string;
}

export function useResolveRecipient() {
  const [result, setResult] = useState<ResolvedRecipient | null>(null);
  const [checking, setChecking] = useState(false);

  async function resolve(id: string): Promise<boolean> {
    setChecking(true);
    try {
      const user = await apiGet<UserDto>(`users/resolve/${id}`);
      setResult({ found: true, name: `${user.firstName} ${user.lastName}`, userId: user.id });
      return true;
    } catch {
      setResult({ found: false, name: '' });
      return false;
    } finally {
      setChecking(false);
    }
  }

  /**
   * Resolves a 10-digit Zeedle account number to a named recipient.
   * Returns 'invalid' for typos caught locally (no network call),
   * false when the number is well-formed but unknown.
   */
  async function resolveByAccountNumber(accountNumber: string): Promise<boolean | 'invalid'> {
    const digits = accountNumber.replace(/\D/g, '');
    if (!isValidAccountNumber(digits)) {
      setResult(null);
      return 'invalid';
    }
    setChecking(true);
    try {
      const recipient = await apiGet<{
        id: string;
        firstName: string;
        lastName: string;
        accountNumber: string;
      }>(`users/resolve?accountNumber=${digits}`);
      setResult({
        found: true,
        name: `${recipient.firstName} ${recipient.lastName}`,
        userId: recipient.id,
        accountNumber: recipient.accountNumber,
      });
      return true;
    } catch {
      setResult({ found: false, name: '' });
      return false;
    } finally {
      setChecking(false);
    }
  }

  function reset() {
    setResult(null);
  }

  return { result, checking, resolve, resolveByAccountNumber, reset };
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function useTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      recipientId: string;
      amount: number;
      pin: string;
      narration?: string;
      idempotencyKey: string;
    }) =>
      apiPost<{ referenceId: string; amountKobo: number; feeKobo: number; balanceKobo: number }>(
        'transfers',
        {
          recipientId: input.recipientId,
          amount: input.amount,
          pin: input.pin,
          narration: input.narration,
        },
        { headers: { 'x-idempotency-key': input.idempotencyKey } },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useFundWallet() {
  return useMutation({
    mutationFn: (input: { amount: number; idempotencyKey: string }) =>
      apiPost<{ checkoutUrl: string; reference: string }>(
        'payments/fund/initialize',
        { amount: input.amount },
        { headers: { 'x-idempotency-key': input.idempotencyKey } },
      ),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPatch(`notifications/${id}/read`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: () => apiDelete('users/me') });
}
