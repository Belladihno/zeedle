import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isValidAccountNumber } from '@zeedle/shared-types';
import type { SettlementDto } from '@zeedle/shared-types';
import { useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
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
