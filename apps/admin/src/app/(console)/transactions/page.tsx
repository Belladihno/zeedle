'use client';

import { useState } from 'react';
import type { TransactionDto } from '@zeedle/shared-types';
import { Icon } from '@/components/brand';
import { useAdminTransactions } from '@/lib/hooks';

function naira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

const EMPTY = { page: 1, limit: 20 } as const;

export default function TransactionsPage() {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [settled, setSettled] = useState('');
  const [page, setPage] = useState(1);
  const [inspected, setInspected] = useState<TransactionDto | null>(null);
  const query = useAdminTransactions({ ...EMPTY, type, status, settled, page });

  function resetFilters() {
    setType('');
    setStatus('');
    setSettled('');
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-brand">
          <span>Ledger Core / Audit Engine</span>
          <span className="h-1 w-1 rounded-full bg-text-muted" />
          <span className="flex items-center gap-1 text-credit">
            <span className="h-1.5 w-1.5 rounded-full bg-credit" />
            Zero Discrepancy SLA
          </span>
        </div>
        <h1 className="text-[28px] font-bold tracking-tight">Platform Transactions Ledger</h1>
        <p className="max-w-3xl text-sm text-text-secondary">
          Global double-entry audit trail across all user wallets, bank corridors, and payment
          gateways with immutable UUID resolution.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-xl bg-elevated p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="f-type" className="text-[11px] uppercase text-text-muted">
              Transaction Type
            </label>
            <select
              id="f-type"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md bg-surface px-2.5 text-sm focus:outline-none"
            >
              <option value="">All Directions</option>
              <option value="CREDIT">CREDIT (Inflow)</option>
              <option value="DEBIT">DEBIT (Outflow)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="f-status" className="text-[11px] uppercase text-text-muted">
              Execution Status
            </label>
            <select
              id="f-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md bg-surface px-2.5 text-sm focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REVERSED">REVERSED</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="f-settled" className="text-[11px] uppercase text-text-muted">
              Settlement Linkage
            </label>
            <select
              id="f-settled"
              value={settled}
              onChange={(e) => {
                setSettled(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md bg-surface px-2.5 text-sm focus:outline-none"
            >
              <option value="">All Batches</option>
              <option value="SETTLED">Settled in Batch</option>
              <option value="UNSETTLED">Unsettled / Real-time</option>
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="flex h-10 items-center justify-center gap-1.5 rounded-md bg-surface px-3 text-[11px] text-text-secondary transition-all hover:text-text-primary"
            >
              <Icon name="filter_alt_off" size={15} />
              <span>Reset Filters ({query.data?.total ?? 0} records)</span>
            </button>
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl bg-elevated shadow-sm">
        <div className="flex items-center gap-2 p-4">
          <Icon name="view_timeline" size={18} />
          <h2 className="text-[15px] font-semibold">Journal Entry Stream</h2>
          <span className="rounded bg-hover px-2 py-0.5 text-[11px] text-text-muted">
            Strict Acid Logs
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface text-[11px] uppercase tracking-wider text-text-muted">
                <th className="px-3 py-2.5 font-medium">Reference ID</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                <th className="px-3 py-2.5 font-medium">Corridor</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Settlement</th>
                <th className="px-3 py-2.5 font-medium">Timestamp</th>
                <th className="px-3 py-2.5 text-right font-medium">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface">
              {query.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-text-secondary">
                    Loading ledger…
                  </td>
                </tr>
              ) : !query.data?.items.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-text-secondary">
                    No journal entries match these filters.
                  </td>
                </tr>
              ) : (
                query.data.items.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setInspected(tx)}
                    className="cursor-pointer transition-colors hover:bg-hover/50"
                  >
                    <td className="px-3 py-3">
                      <span className="block w-32 truncate font-mono text-[11px] text-brand" title={tx.referenceId}>
                        {tx.referenceId}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          tx.type === 'CREDIT'
                            ? 'bg-credit/10 text-credit'
                            : 'bg-debit/15 text-debit'
                        }`}
                      >
                        <Icon
                          name={tx.type === 'CREDIT' ? 'arrow_downward' : 'arrow_upward'}
                          size={13}
                        />
                        {tx.type}
                      </span>
                    </td>
                    <td className="tabular px-3 py-3 text-right text-sm font-semibold">
                      {tx.type === 'CREDIT' ? '+' : '-'}
                      {naira(tx.amount)}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-surface px-2 py-1 text-[11px] text-text-secondary">
                        {tx.source}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          tx.status === 'SUCCESS'
                            ? 'bg-credit/10 text-credit'
                            : tx.status === 'PENDING'
                              ? 'bg-hover text-brand'
                              : 'bg-debit/15 text-debit'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {tx.settlementId ? (
                        <span className="rounded bg-brand/10 px-2 py-0.5 font-mono text-[11px] text-brand">
                          {tx.settlementId.slice(0, 8)}…
                        </span>
                      ) : (
                        <span className="text-[11px] text-text-muted">Unsettled</span>
                      )}
                    </td>
                    <td className="tabular px-3 py-3 font-mono text-[11px] text-text-muted">
                      {new Date(tx.createdAt).toLocaleString('en-NG')}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="rounded bg-surface px-2.5 py-1 text-[11px] font-medium text-brand">
                        Inspect
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] text-text-muted">
          <span>
            Showing {query.data?.items.length ?? 0} of{' '}
            <strong className="text-text-primary">{query.data?.total ?? 0}</strong> records
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
              disabled={!query.data || page * 20 >= query.data.total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg bg-surface px-3 py-1.5 transition-colors hover:bg-hover disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {inspected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0e13]/80 p-4 backdrop-blur-md">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-xl bg-elevated p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[15px] font-semibold">Journal Entry Inspection</h2>
                <span className="font-mono text-[11px] text-text-muted">{inspected.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setInspected(null)}
                className="rounded-md p-1 text-text-muted hover:text-text-primary"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-2 rounded-lg bg-surface p-4 text-sm">
              {(
                [
                  ['Reference', inspected.referenceId],
                  ['External ref', inspected.externalReference ?? '—'],
                  ['Type', inspected.type],
                  ['Status', inspected.status],
                  ['Source', inspected.source],
                  ['Amount', naira(inspected.amount)],
                  ['Fee', naira(inspected.fee)],
                  ['Balance before', naira(inspected.balanceBefore)],
                  ['Balance after', naira(inspected.balanceAfter)],
                  ['Narration', inspected.narration ?? '—'],
                  ['Wallet', inspected.walletId],
                  ['Settlement', inspected.settlementId ?? 'Unsettled'],
                  ['Timestamp', new Date(inspected.createdAt).toLocaleString('en-NG')],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <span className="shrink-0 text-[11px] text-text-muted">{label}</span>
                  <span className="tabular truncate text-right font-mono text-xs">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
