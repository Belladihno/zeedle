'use client';

import Link from 'next/link';
import { Icon } from '@/components/brand';
import { useSettlements } from '@/lib/hooks';

function naira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

export default function OverviewPage() {
  const batches = useSettlements(1, 100);

  const items = batches.data?.items ?? [];
  const settledVolume = items
    .filter((b) => b.status === 'COMPLETED')
    .reduce((sum, b) => sum + b.totalAmount, 0);
  const settledCount = items.filter((b) => b.status === 'COMPLETED').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight">Platform Overview</span>
            <span className="flex items-center gap-1 rounded-full bg-credit/15 px-2 py-0.5 text-[11px] text-credit">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-credit" />
              CBN AUDIT COMPLIANT
            </span>
          </div>
          <p className="mt-0.5 text-sm text-text-muted">
            Real-time ledger telemetry, system solvency, and core financial throughput
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            title="Export needs the metrics endpoint"
            disabled
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-elevated px-3 py-2 text-xs opacity-60"
          >
            <Icon name="download" size={16} />
            <span>Export Telemetry (CSV)</span>
          </button>
          <Link
            href="/settlements"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-brand-dim active:scale-95"
          >
            <Icon name="bolt" size={18} />
            <span>Run Settlement</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-elevated p-4 shadow-sm">
          <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-brand/5 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-text-muted">
              Total Settled Volume
            </span>
          </div>
          <div className="tabular my-2 text-[28px] font-bold leading-8 tracking-tight">
            {batches.isLoading ? '…' : naira(settledVolume)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>{settledCount} batches completed</span>
            <span className="font-medium text-text-secondary">Reconciled 100%</span>
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-elevated p-4 shadow-sm">
          <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-debit/5 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-text-muted">
              Unsettled Window
            </span>
            <span className="rounded bg-hover px-1.5 py-0.5 text-[11px] text-text-muted">
              Pending API §5.1
            </span>
          </div>
          <div className="tabular my-2 text-[28px] font-bold leading-8 tracking-tight text-text-muted">
            ———
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>Needs the metrics endpoint</span>
            <span className="font-medium">Pending batch trigger</span>
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-elevated p-4 shadow-sm">
          <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-brand/5 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-text-muted">
              Wallets & Accounts
            </span>
            <span className="rounded bg-hover px-1.5 py-0.5 text-[11px] text-text-muted">
              Pending API §5.1
            </span>
          </div>
          <div className="tabular my-2 text-[28px] font-bold leading-8 tracking-tight text-text-muted">
            ———
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>Needs the metrics endpoint</span>
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-elevated p-4 shadow-sm">
          <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-credit/5 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-text-muted">
              System Reliability
            </span>
            <span className="flex items-center gap-1 rounded-full bg-credit/15 px-2 py-0.5 text-[11px] font-semibold text-credit">
              <span className="h-1.5 w-1.5 rounded-full bg-credit" />
              Operational
            </span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="tabular text-[28px] font-bold leading-8 tracking-tight">API OK</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>Console connected to ledger API</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-elevated shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold">Recent Settlement Batches</span>
            <span className="rounded bg-hover px-2 py-0.5 text-[11px] text-text-secondary">
              Live Stream
            </span>
          </div>
          <Link
            href="/settlements"
            className="flex items-center gap-0.5 text-xs font-medium text-brand hover:underline"
          >
            <span>View all</span>
            <Icon name="chevron_right" size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface text-[11px] uppercase tracking-wider text-text-muted">
                <th className="px-4 py-2.5 font-medium">Batch ID</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount (₦)</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface">
              {batches.isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-text-secondary">
                    Loading…
                  </td>
                </tr>
              ) : !items.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-text-secondary">
                    No batches yet —{' '}
                    <Link href="/settlements" className="text-brand hover:underline">
                      run the first settlement
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                items.slice(0, 10).map((batch) => (
                  <tr key={batch.id} className="transition-colors hover:bg-hover/50">
                    <td className="max-w-[240px] truncate px-4 py-3 font-mono text-xs" title={batch.id}>
                      {batch.id}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-sm font-semibold">
                      {naira(batch.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          batch.status === 'COMPLETED'
                            ? 'bg-credit/15 text-credit'
                            : 'bg-pending/15 text-pending'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                    <td className="tabular px-4 py-3 text-xs text-text-muted">
                      {new Date(batch.createdAt).toLocaleString('en-NG')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
