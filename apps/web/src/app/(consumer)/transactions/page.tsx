'use client';

import { useState } from 'react';
import { Icon } from '@/components/brand';
import { AppHeader } from '@/components/headers';
import { useTransactionHistory } from '@/lib/hooks';
import type { TransactionDto } from '@zeedle/shared-types';

type TypeFilter = 'ALL' | 'CREDIT' | 'DEBIT';

function sourceIcon(tx: TransactionDto): string {
  if (tx.source === 'PAYSTACK') return tx.type === 'CREDIT' ? 'add_card' : 'account_balance';
  return tx.type === 'CREDIT' ? 'south_west' : 'arrow_outward';
}

function txLabel(tx: TransactionDto): string {
  if (tx.narration) return tx.narration;
  if (tx.source === 'PAYSTACK') return tx.type === 'CREDIT' ? 'Paystack Card Deposit' : 'Paystack Bank Top-up';
  return tx.type === 'CREDIT' ? 'Wallet credit' : 'Transfer';
}

function DetailSheet({ tx, onClose }: { tx: TransactionDto; onClose: () => void }) {
  const inflow = tx.type === 'CREDIT';
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px] rounded-t-2xl bg-elevated px-4 pb-8 pt-3 shadow-[0_-8px_32px_rgba(0,0,0,0.65)]"
      >
        <div className="-mt-1 mb-1 flex items-center justify-center">
          <span className="h-1 w-10 rounded-full bg-[#454654]/60" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Icon name="receipt_long" size={15} />
            </div>
            <span className="text-[15px] font-semibold">Transaction Detail</span>
          </div>
          <button
            type="button"
            aria-label="Close sheet"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f1f25] text-text-secondary hover:text-text-primary"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl bg-[#0e0e13]/60 py-2">
          <span className="text-[11px] uppercase tracking-wider text-text-secondary">
            Total {inflow ? 'Credited' : 'Debited'}
          </span>
          <span className={`tabular mb-1 text-[28px] font-bold leading-[34px] tracking-tight ${inflow ? '' : 'text-debit'}`}>
            {inflow ? '+' : '-'}₦{(tx.amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-credit/15 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-credit">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-credit" />
              {tx.status}
            </span>
            <span className="rounded-full bg-[#1f1f25] px-2 py-0.5 text-[11px] text-text-secondary">
              {tx.type} ({tx.source === 'TRANSFER' ? 'P2P Transfer' : tx.source})
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 rounded-xl bg-[#1f1f25] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-text-secondary">Reference ID</span>
            <CopyButton text={tx.referenceId} display={`${tx.referenceId.slice(0, 12)}…${tx.referenceId.slice(-6)}`} />
          </div>
          <div className="flex items-start justify-between gap-3 pt-2">
            <span className="shrink-0 text-[11px] text-text-secondary">Counterparty</span>
            <div className="flex flex-col items-end text-right">
              <span className="text-sm font-semibold">{inflow ? 'Paystack Gateway' : 'Zeedle Peer'}</span>
              <span className="text-[11px] text-brand">zeedle.me/@peer</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-text-secondary">Timestamp</span>
            <span className="tabular text-sm">
              {new Date(tx.createdAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-text-secondary">Narration</span>
            <span className="text-right text-sm italic">{tx.narration ? `"${tx.narration}"` : '—'}</span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-text-secondary">Network Fee</span>
            <span className="tabular text-sm font-medium text-credit">
              ₦{(tx.fee / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })} (Zero Fee)
            </span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-text-secondary">Ledger Balance After</span>
            <span className="tabular text-[15px] font-semibold">
              ₦{(tx.balanceAfter / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 px-2 text-center text-text-secondary">
          <Icon name="lock" size={13} />
          <span className="text-[11px]">Cryptographically signed &amp; settled on Zeedle Ledger v2</span>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary flex flex-1 items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
          >
            <Icon name="download" size={18} />
            <span>Download PDF Receipt</span>
          </button>
          <button
            type="button"
            aria-label="Share receipt"
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1f1f25] transition-colors hover:bg-[#35343a]"
          >
            <Icon name="share" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text, display }: { text: string; display: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — truncated display still visible.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 rounded bg-elevated px-2 py-1 transition-all hover:bg-hover active:scale-95"
    >
      <span className="tabular max-w-[170px] truncate text-[11px] text-text-secondary">{display}</span>
      <span className="text-brand">
        <Icon name={copied ? 'check' : 'content_copy'} size={14} />
      </span>
    </button>
  );
}

export default function TransactionsPage() {
  const [type, setType] = useState<TypeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TransactionDto | null>(null);
  const history = useTransactionHistory({
    ...(type === 'ALL' ? {} : { type }),
    page,
    limit: 20,
  });

  const query = search.trim().toLowerCase();
  const items = (history.data?.items ?? []).filter((tx) =>
    query
      ? (tx.narration ?? '').toLowerCase().includes(query) ||
        tx.referenceId.toLowerCase().includes(query)
      : true,
  );
  const total = history.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-surface px-4 pb-24 pt-20">
        <div className="flex flex-col gap-1 pb-3 pt-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Transaction History</h1>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
              {total} Transactions
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span className="text-credit">
              <Icon name="verified_user" size={14} />
            </span>
            <span>Complete immutable double-entry ledger</span>
          </div>
        </div>

        <div className="mb-2">
          <div className="relative flex w-full items-center rounded-lg bg-[#1f1f25] px-3 py-2.5 shadow-sm">
            <span className="mr-2.5 text-text-secondary">
              <Icon name="search" size={18} />
            </span>
            <input
              type="search"
              placeholder="Search by reference or narration..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search transactions"
              className="w-full bg-transparent text-sm outline-none placeholder:text-text-muted"
            />
            <span className="ml-1 flex items-center justify-center text-text-muted">
              <Icon name="mic" size={18} />
            </span>
          </div>
        </div>

        <div className="no-scrollbar mb-3 flex items-center gap-2 overflow-x-auto px-0 py-1">
          {(['ALL', 'CREDIT', 'DEBIT'] as TypeFilter[]).map((option) => {
            const activeOpt = type === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setType(option);
                  setPage(1);
                }}
                className={`flex items-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeOpt
                    ? 'bg-brand/20 text-[#bcc2ff] shadow-[0_0_12px_rgba(91,110,245,0.25)]'
                    : 'bg-[#1f1f25] text-text-secondary hover:bg-hover'
                }`}
              >
                {option === 'ALL' ? 'All Types' : option === 'CREDIT' ? 'Credits (Inflow)' : 'Debits (Outflow)'}
              </button>
            );
          })}
          <button
            type="button"
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-[#1f1f25] px-2.5 py-1.5 text-xs text-text-secondary"
          >
            <Icon name="tune" size={15} />
            <span>Filter &amp; Date</span>
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between rounded-lg bg-[#1b1b20] p-3">
          <SummarySide
            icon="arrow_downward"
            label="Inflow"
            value={items.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0)}
            positive
          />
          <div className="h-6 w-px bg-[#35343a]" />
          <SummarySide
            icon="arrow_upward"
            label="Outflow"
            value={items.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0)}
            positive={false}
          />
        </div>

        <div className="flex flex-col gap-2 pb-6">
          {history.isLoading ? (
            <p className="py-6 text-center text-sm text-text-secondary">Loading…</p>
          ) : !items.length ? (
            <div className="py-6 text-center">
              <p className="text-sm font-medium">No transactions yet</p>
              <p className="mt-1 text-xs text-text-secondary">Start by funding your wallet</p>
            </div>
          ) : (
            items.map((tx) => {
              const inflow = tx.type === 'CREDIT';
              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setSelected(tx)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-hover ${
                    selected?.id === tx.id ? 'bg-elevated shadow-[0_0_16px_rgba(91,110,245,0.08)]' : 'bg-[#1f1f25]'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        inflow ? 'bg-credit/10 text-credit' : 'bg-debit/10 text-debit'
                      }`}
                    >
                      <Icon name={sourceIcon(tx)} size={20} />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[15px] font-semibold">{txLabel(tx)}</span>
                      <span className="text-[11px] text-text-secondary">
                        {new Date(tx.createdAt).toLocaleString('en-NG', {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className={`tabular text-[15px] font-semibold ${inflow ? 'text-credit' : 'text-debit'}`}>
                      {inflow ? '+' : '-'}₦{(tx.amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] ${
                        tx.status === 'SUCCESS'
                          ? 'bg-credit/10 text-credit'
                          : tx.status === 'PENDING'
                            ? 'bg-pending/10 text-pending'
                            : 'bg-debit/10 text-debit'
                      }`}
                    >
                      <span
                        className={`h-1 w-1 rounded-full ${
                          tx.status === 'SUCCESS' ? 'bg-credit' : tx.status === 'PENDING' ? 'bg-pending' : 'bg-debit'
                        }`}
                      />
                      {tx.status === 'SUCCESS' ? 'Success' : tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between pb-4 text-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary !h-11 !w-auto px-4 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-text-secondary">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary !h-11 !w-auto px-4 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        ) : null}

        {selected ? <DetailSheet tx={selected} onClose={() => setSelected(null)} /> : null}
      </main>
    </>
  );
}

function SummarySide({
  icon,
  label,
  value,
  positive,
}: {
  icon: string;
  label: string;
  value: number;
  positive: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          positive ? 'bg-credit/10 text-credit' : 'bg-debit/10 text-debit'
        }`}
      >
        <Icon name={icon} size={16} />
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] text-text-secondary">{label}</span>
        <span className={`tabular text-xs font-semibold ${positive ? 'text-credit' : 'text-debit'}`}>
          {positive ? '+' : '-'}₦{(value / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
