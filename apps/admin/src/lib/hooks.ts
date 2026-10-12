import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isValidAccountNumber } from '@zeedle/shared-types';
import type { SettlementDto, TransactionDto, UserDto } from '@zeedle/shared-types';
import { useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PlatformMetrics {
  users: number;
  activeWallets: number;
  frozenWallets: number;
  unsettledKobo: number;
  unsettledCount: number;
  settledVolumeKobo: number;
  settlementCount: number;
}

export interface AdminUserView extends UserDto {
  wallet: {
    id: string;
    accountNumber: string;
    balanceKobo: number;
    currency: string;
    isActive: boolean;
  } | null;
}

export interface AdminTransactionFilters {
  type?: string;
  status?: string;
  settled?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export function usePlatformMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => apiGet<PlatformMetrics>('admin/metrics'),
    staleTime: 60_000,
  });
}

export function useAdminUsers(search: string, page: number) {
  return useQuery({
    queryKey: ['admin', 'users', search, page],
    queryFn: () =>
      apiGet<Page<AdminUserView>>(
        `admin/users?search=${encodeURIComponent(search)}&page=${page}&limit=20`,
      ),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useAdminTransactions(filters: AdminTransactionFilters) {
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]),
  );
  return useQuery({
    queryKey: ['admin', 'transactions', filters],
    queryFn: () => apiGet<Page<TransactionDto>>(`admin/transactions?${params}`),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useFreezeWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; action: 'FREEZE' | 'UNFREEZE'; reason: string }) =>
      apiPatch<{ userId: string; accountNumber: string; isActive: boolean; action: string }>(
        `admin/users/${input.userId}/wallet`,
        { action: input.action, reason: input.reason },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
    },
  });
}

export function useSettlements(page: number, limit = 10) {
  return useQuery({
    queryKey: ['settlements', page, limit],
    queryFn: () => apiGet<Page<SettlementDto>>(`settlements?page=${page}&limit=${limit}`),
    staleTime: 60_000,
  });
}

export function useRunSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { periodStart: string; periodEnd: string }) =>
      apiPost<SettlementDto>('settlements/run', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
  });
}

export interface AccountResolution {
  state: 'idle' | 'invalid' | 'checking' | 'found' | 'missing';
  name?: string;
  accountNumber?: string;
}

/**
 * Support lookup against the public resolve (name-only by design).
 * Full admin resolve with contact data + freeze actions awaits API §5.2.
 */
export function useAccountResolution() {
  const [resolution, setResolution] = useState<AccountResolution>({ state: 'idle' });

  async function resolve(raw: string): Promise<void> {
    const digits = raw.replace(/\D/g, '');
    if (!isValidAccountNumber(digits)) {
      setResolution({ state: 'invalid' });
      return;
    }
    setResolution({ state: 'checking' });
    try {
      const recipient = await apiGet<{ firstName: string; lastName: string; accountNumber: string }>(
        `users/resolve?accountNumber=${digits}`,
      );
      setResolution({
        state: 'found',
        name: `${recipient.firstName} ${recipient.lastName}`,
        accountNumber: recipient.accountNumber,
      });
    } catch {
      setResolution({ state: 'missing' });
    }
  }

  function reset() {
    setResolution({ state: 'idle' });
  }

  return { resolution, resolve, reset };
}
