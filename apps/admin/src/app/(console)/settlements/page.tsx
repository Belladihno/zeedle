'use client';

import { useState } from 'react';
import type { SettlementDto } from '@zeedle/shared-types';
import { Icon } from '@/components/brand';
import { problemDetail } from '@/lib/api';
import { useRunSettlement, useSettlements } from '@/lib/hooks';

function naira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

function todayWindow(): { start: string; end: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return { start: `${day}T00:00`, end: `${day}T23:59` };
}

export default function SettlementsPage() {
  const [page, setPage] = useState(1);
  const history = useSettlements(page, 10);
  const run = useRunSettlement();
  const [window_] = useState(todayWindow);
  const [periodStart, setPeriodStart] = useState(window_.start);
  const [periodEnd, setPeriodEnd] = useState(window_.end);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [notice, setNotice] = useState('');
  const [lastBatch, setLastBatch] = useState<SettlementDto | null>(null);

  async function execute() {
    if (confirmText !== 'CONFIRM') return;
    setNotice('');
    try {
      const batch = await run.mutateAsync({
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
      });
      setLastBatch(batch);
      setModalOpen(false);
      setConfirmText('');
      setPage(1);
    } catch (error) {
      const status = (error as { response?: { status: number } })?.response?.status;
      if (status === 400) {
        setModalOpen(false);
        setConfirmText('');
        setNotice('HTTP 400: No unsettled transactions in selected range. Safe state maintained.');
      } else {
        setNotice(await problemDetail(error));
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-text-muted">
            <Icon name="account_tree" size={14} />
            <span>TRD §14 • Core FinOps Engine</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight">Settlement Operations Engine</h1>
          <p className="text-sm text-text-secondary">
            Batch reconciliation and immutable double-entry ledger finalization
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-2 rounded-full bg-elevated px-3 py-1.5 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-credit opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-credit" />
            </span>
            <span className="text-[11px] text-text-primary">
              Batch Status: <span className="font-semibold text-credit">Ready to Run</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-elevated p-6 shadow-md lg:col-span-7">
          <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded bg-brand/20 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-brand">
                  Settlement Window
                </span>
                <span className="text-[11px] text-text-muted">Real-time Accumulator</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-text-muted">
                <Icon name="verified" size={14} />
                Strict Double-Entry
              </span>
            </div>
            <div>
              <span className="mb-1 block text-[11px] uppercase tracking-wider text-text-muted">
                Selected Period
              </span>
              <p className="tabular flex items-center gap-1.5 text-sm font-medium">
                <Icon name="calendar_clock" size={16} />
                {periodStart.replace('T', ' ')} → {periodEnd.replace('T', ' ')}
              </p>
            </div>
            {lastBatch ? (
              <div className="rounded-lg bg-[#0e0e13] p-4 shadow-inner">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-text-muted">Last Batch Settled</span>
                  <span className="badge badge-success">COMPLETED</span>
                </div>
                <div className="tabular mt-1 text-[28px] font-bold tracking-tight">
                  {naira(lastBatch.totalAmount)}
                </div>
                <div className="mt-1 text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{lastBatch.transactionCount}</span>{' '}
                  transactions locked
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-[#0e0e13] p-4 shadow-inner">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-text-muted">Unsettled Liquidity Preview</span>
                  <span className="rounded bg-elevated px-1.5 py-0.5 text-[11px] text-text-muted">
                    Pending API §5.1
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  Live unsettled-volume preview needs the metrics endpoint. Run a batch to
                  finalize the selected window — empty ranges are rejected safely.
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="flex flex-col rounded-lg bg-surface p-3">
                <span className="mb-1 text-[11px] text-text-muted">Gross Credits</span>
                <span className="tabular text-sm font-semibold text-credit">
                  {lastBatch ? naira(lastBatch.totalAmount) : '—'}
                </span>
                <span className="mt-1 text-[11px] text-text-muted">
                  {lastBatch ? `${lastBatch.transactionCount} ledgers` : 'run a batch'}
                </span>
              </div>
              <div className="flex flex-col rounded-lg bg-surface p-3">
                <span className="mb-1 text-[11px] text-text-muted">Fee Deductions</span>
                <span className="tabular text-sm font-semibold">₦0.00</span>
                <span className="mt-1 text-[11px] text-text-muted">0 bps waived</span>
              </div>
              <div className="flex flex-col rounded-lg bg-surface p-3">
                <span className="mb-1 text-[11px] text-text-muted">Net Payable</span>
                <span className="tabular text-sm font-semibold text-brand">
                  {lastBatch ? naira(lastBatch.totalAmount) : '—'}
                </span>
                <span className="mt-1 text-[11px] text-text-muted">100% guaranteed</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-elevated p-6 shadow-md lg:col-span-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="bolt" size={20} />
                <span className="text-[15px] font-semibold">Trigger Settlement Batch</span>
              </div>
              <span className="rounded bg-[#0e0e13] px-2 py-0.5 font-mono text-[11px] text-text-muted">
                POST /settlements/run
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="period-start" className="text-[11px] font-semibold uppercase text-text-muted">
                  Period Start
                </label>
                <input
                  id="period-start"
                  type="datetime-local"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="tabular h-10 rounded-lg bg-[#0e0e13] px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="period-end" className="text-[11px] font-semibold uppercase text-text-muted">
                  Period End
                </label>
                <input
                  id="period-end"
                  type="datetime-local"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="tabular h-10 rounded-lg bg-[#0e0e13] px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-debit/10 p-3">
              <span className="mt-0.5 shrink-0 text-debit">
                <Icon name="warning" size={18} />
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-debit">
                  Ledger Finalization Notice
                </span>
                <p className="text-[11px] leading-snug text-text-secondary">
                  Executing settlement finalizes money movement records. This action is
                  cryptographically immutable and cannot be rolled back.
                </p>
              </div>
            </div>
            {notice ? (
              <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                  <Icon name="info" size={16} />
                  <span>{notice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotice('')}
                  className="text-sm text-text-muted hover:text-text-primary"
                >
                  ✕
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setConfirmText('');
                setModalOpen(true);
              }}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Icon name="bolt" size={20} />
              <span>Run Settlement Batch</span>
            </button>
            <span className="text-right text-[11px] text-text-muted">Auth Level: ADMIN</span>
          </div>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0e13]/80 p-4 backdrop-blur-md">
          <div className="relative flex w-full max-w-lg flex-col gap-4 overflow-hidden rounded-xl bg-elevated p-6 shadow-2xl">
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-brand via-debit to-credit" />
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-debit/20 p-2 text-debit">
                  <Icon name="gavel" size={22} />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold">Confirm Settlement Batch Run</h2>
                  <span className="text-[11px] text-text-muted">
                    Admin Transaction Finalization Protocol
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-text-muted hover:text-text-primary"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-2 rounded-lg bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted">Settlement Window</span>
                <span className="tabular text-xs font-semibold">
                  {periodStart.replace('T', ' ')} → {periodEnd.replace('T', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-[11px] text-text-muted">Effect</span>
                <span className="text-xs font-medium">
                  Lock all unsettled transactions in range
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="confirm-input" className="text-[11px] text-text-muted">
                To proceed, type <span className="font-mono font-bold text-text-primary">CONFIRM</span> below to authorize:
              </label>
              <input
                id="confirm-input"
                type="text"
                placeholder="Type CONFIRM..."
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="h-11 w-full rounded-lg bg-[#0e0e13] px-4 font-mono text-sm tracking-wider focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-4 py-2.5 text-sm text-text-secondary hover:bg-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void execute()}
                disabled={confirmText !== 'CONFIRM' || run.isPending}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  confirmText === 'CONFIRM' && !run.isPending
                    ? 'bg-brand text-white hover:bg-brand-dim'
                    : 'cursor-not-allowed bg-brand/40 text-text-primary/40'
                }`}
              >
                <Icon name={run.isPending ? 'progress_activity' : 'verified'} size={18} />
                <span>{run.isPending ? 'Finalizing…' : 'Authorize Batch Finalization'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-xl bg-elevated p-6 shadow-md">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex flex-col">
            <h3 className="text-[15px] font-semibold">Historical Settlement Batches</h3>
            <span className="text-[11px] text-text-muted">
              GET /settlements • Complete Audit Trail
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface text-[11px] uppercase tracking-wider text-text-muted">
                <th className="rounded-l-lg px-4 py-2.5 font-medium">Batch ID</th>
                <th className="px-3 py-2.5 font-medium">Period Covered</th>
                <th className="px-3 py-2.5 text-right font-medium">Total Amount</th>
                <th className="px-3 py-2.5 text-center font-medium">Txns</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Triggered By</th>
                <th className="rounded-r-lg px-4 py-2.5 font-medium">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface">
              {history.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-text-secondary">
                    Loading batches…
                  </td>
                </tr>
              ) : !history.data?.items.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-text-secondary">
                    No settlement batches yet. Run the first batch above.
                  </td>
                </tr>
              ) : (
                history.data.items.map((batch) => (
                  <tr key={batch.id} className="transition-colors hover:bg-hover/50">
                    <td className="px-4 py-3">
                      <span className="max-w-[220px] truncate font-mono text-xs" title={batch.id}>
                        {batch.id}
                      </span>
                    </td>
                    <td className="tabular px-3 py-3 text-xs text-text-secondary">
                      {new Date(batch.periodStart).toLocaleDateString('en-NG')} →{' '}
                      {new Date(batch.periodEnd).toLocaleDateString('en-NG')}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-sm font-semibold">
                      {naira(batch.totalAmount)}
                    </td>
                    <td className="tabular px-3 py-3 text-center text-xs text-text-secondary">
                      {batch.transactionCount} txns
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          batch.status === 'COMPLETED'
                            ? 'bg-credit/20 text-credit'
                            : 'bg-pending/20 text-pending'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            batch.status === 'COMPLETED' ? 'bg-credit' : 'bg-pending'
                          }`}
                        />
                        {batch.status}
                      </span>
                    </td>
                    <td className="tabular px-3 py-3 font-mono text-[11px] text-text-muted">
                      {batch.triggeredBy.slice(0, 8)}…
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
        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <span>
            Showing {history.data?.items.length ?? 0} of{' '}
            <strong className="text-text-primary">{history.data?.total ?? 0}</strong> batches
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg bg-surface px-3 py-1.5 transition-colors hover:bg-hover disabled:opacity-40"
            >
              Prev
            </button>
            <span className="tabular">Page {page}</span>
            <button
              type="button"
              disabled={!history.data || page * 10 >= history.data.total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg bg-surface px-3 py-1.5 transition-colors hover:bg-hover disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
