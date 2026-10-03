'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon, initialsOf } from '@/components/brand';
import { AppHeader } from '@/components/headers';
import { TxRow } from '@/components/tx-row';
import { useRecentTransactions, useTransactionHistory, useWallet } from '@/lib/hooks';
import { useAuthStore } from '@/stores/auth-store';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  const wallet = useWallet();
  const recent = useRecentTransactions();

  const firstName = user?.firstName ?? 'there';
  const balance = wallet.data?.balanceNaira ?? '₦0.00';
  const monthLabel = new Date().toLocaleString('en-NG', { month: 'short' });

  const ledger = useTransactionHistory({ page: 1, limit: 100 });
  const credits = (ledger.data?.items ?? []).filter(
    (tx) => tx.type === 'CREDIT' && tx.status === 'SUCCESS',
  );
  const debits = (ledger.data?.items ?? []).filter(
    (tx) => tx.type === 'DEBIT' && tx.status === 'SUCCESS',
  );
  const inflowKobo = credits.reduce((sum, tx) => sum + tx.amount, 0);
  const outflowKobo = debits.reduce((sum, tx) => sum + tx.amount, 0);
  const naira = (kobo: number) =>
    `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  return (
    <>
      <AppHeader initials={user ? initialsOf(`${user.firstName} ${user.lastName}`) : '••'} />
      <main className="app-column flex min-h-screen flex-1 flex-col bg-surface pb-24 pt-16">
        <div className="flex w-full flex-col gap-5 px-4 pb-6">
        <section className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold tracking-tight">
              {greeting()}, {firstName}
            </h1>
            <span className="text-xs font-medium text-text-secondary">Personal Wallet • NGN</span>
          </div>
          <button
            type="button"
            aria-label="Scan QR Code"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-elevated transition-colors hover:text-brand active:scale-95"
          >
            <Icon name="qr_code_scanner" size={22} />
          </button>
        </section>

        <section className="relative overflow-hidden rounded-2xl bg-[#111118] p-5 shadow-2xl">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-credit/5 blur-2xl" />
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                  Total Available Balance
                </span>
                <button
                  type="button"
                  aria-label={hidden ? 'Show balance' : 'Hide balance'}
                  onClick={() => setHidden((h) => !h)}
                  className="flex h-11 w-11 items-center justify-center text-text-secondary transition-transform hover:text-text-primary active:scale-90"
                >
                  <Icon name={hidden ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-credit/10 px-2.5 py-0.5 text-credit">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-credit" />
                <span className="text-[11px] font-medium tracking-wide">Active</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="tabular text-[28px] font-bold leading-[34px] tracking-tight">
                {wallet.isLoading ? '…' : hidden ? '••••••••' : balance}
              </span>
              <span className="flex items-center gap-1.5 text-text-secondary">
                <Icon name="verified_user" size={15} />
                <span className="text-[11px] font-medium">Tier 2 Verified Account</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const number = wallet.data?.accountNumber;
                  if (!number) return;
                  void navigator.clipboard
                    ?.writeText(number)
                    .then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    })
                    .catch(() => undefined);
                }}
                title="Copy Zeedle account number"
                className="tabular flex items-center gap-1.5 self-start rounded-lg bg-elevated px-2.5 py-1.5 text-left transition-colors hover:bg-hover active:scale-[0.98]"
              >
                <span className="text-[11px] text-text-secondary">Zeedle acct</span>
                <span className="text-[13px] font-semibold tracking-wider">
                  {wallet.data ? wallet.data.accountNumber : '…………'}
                </span>
                <span className="text-brand">
                  <Icon name={copied ? 'check' : 'content_copy'} size={14} />
                </span>
              </button>
            </div>
            <div className="flex flex-col gap-2.5 pt-1">
              <Link
                href="/transfer"
                className="btn-primary flex h-12 items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
              >
                <span>Send Money</span>
                <Icon name="arrow_outward" size={19} />
              </Link>
              <Link
                href="/fund"
                className="btn-secondary flex h-12 items-center justify-center gap-2"
              >
                <Icon name="add_circle" size={19} />
                <span>Fund Wallet</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="flex flex-col justify-between gap-2 rounded-xl bg-[#111118] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-secondary">Inflow ({monthLabel})</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-credit/10 text-credit">
                <Icon name="south_west" size={14} />
              </div>
            </div>
            <div>
              <div className="tabular text-[15px] font-semibold text-credit">+{naira(inflowKobo)}</div>
              <span className="text-[11px] text-text-secondary/80">
                {credits.length} deposit{credits.length === 1 ? '' : 's'} cleared
              </span>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-2 rounded-xl bg-[#111118] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-secondary">Outflow ({monthLabel})</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-debit/10 text-debit">
                <Icon name="north_east" size={14} />
              </div>
            </div>
            <div>
              <div className="tabular text-[15px] font-semibold text-debit">-{naira(outflowKobo)}</div>
              <span className="text-[11px] text-text-secondary/80">
                {debits.length} transfer{debits.length === 1 ? '' : 's'} routed
              </span>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-brand">
                <Icon name="history" size={18} />
              </span>
              <h2 className="text-[15px] font-semibold">Recent Activity</h2>
            </div>
            <Link
              href="/transactions"
              className="flex items-center gap-0.5 text-xs font-medium text-brand transition-colors hover:text-[#bcc2ff]"
            >
              <span>View all</span>
              <Icon name="chevron_right" size={14} />
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl bg-[#111118]">
            {recent.isLoading ? (
              <p className="py-6 text-center text-sm text-text-secondary">Loading…</p>
            ) : !recent.data?.items.length ? (
              <div className="py-6 text-center">
                <p className="text-sm font-medium">No transactions yet</p>
                <p className="mt-1 text-xs text-text-secondary">Start by funding your wallet</p>
                <Link href="/fund" className="btn-primary mx-auto mt-3 max-w-[200px]">
                  Fund Wallet
                </Link>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {recent.data.items.map((tx) => (
                  <TxRow key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="flex items-center justify-center gap-1.5 py-2 text-text-secondary/70">
          <Icon name="lock" size={14} />
          <p className="text-center text-[11px] tracking-wide">
            256-bit bank-grade encryption • NDPA compliant
          </p>
        </footer>
        </div>
      </main>
    </>
  );
}
