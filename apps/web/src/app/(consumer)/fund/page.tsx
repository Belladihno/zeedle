'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/brand';
import { problemDetail } from '@/lib/api';
import { newIdempotencyKey, useFundWallet, useWallet } from '@/lib/hooks';

const CHIPS = [1000, 5000, 10000, 20000, 50000, 100000];

export default function FundPage() {
  const router = useRouter();
  const wallet = useWallet();
  const fund = useFundWallet();
  const [amountText, setAmountText] = useState('20,000');
  const [error, setError] = useState('');

  const naira = Number(amountText.replace(/[^0-9]/g, ''));

  function format(raw: string) {
    const digits = raw.replace(/[^0-9]/g, '');
    setAmountText(digits ? Number(digits).toLocaleString('en-NG') : '');
  }

  async function submit() {
    setError('');
    if (!Number.isInteger(naira) || naira < 100) {
      setError('Minimum deposit is ₦100.');
      return;
    }
    if (naira > 10000000) {
      setError('Maximum deposit is ₦10,000,000.');
      return;
    }
    try {
      const { checkoutUrl } = await fund.mutateAsync({ amount: naira, idempotencyKey: newIdempotencyKey() });
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(await problemDetail(err));
    }
  }

  return (
    <main className="app-column flex min-h-screen flex-col gap-4 bg-surface px-4 pb-24 pt-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated shadow-sm transition-all hover:bg-hover active:scale-95"
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Fund Wallet</h1>
            <p className="text-[11px] text-text-secondary">Instant top-up via Paystack gateway</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-elevated px-2.5 py-1 shadow-sm">
          <span className="text-credit">
            <Icon name="verified_user" size={14} />
          </span>
          <span className="text-[11px] font-medium text-text-secondary">Secured</span>
        </div>
      </div>

      <div className="flex w-full items-center justify-between rounded-xl bg-[#1f1f25] p-3.5 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-elevated text-brand">
            <Icon name="account_balance_wallet" size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-text-secondary">Current Balance</span>
            <span className="tabular text-sm font-semibold">
              {wallet.data?.balanceNaira ?? '…'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-credit/10 px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-credit" />
          <span className="text-[11px] font-medium text-credit">Active Ledger</span>
        </div>
      </div>

      <div className="w-full space-y-4 rounded-xl bg-[#1f1f25] p-4 shadow-md">
        <div className="flex items-center justify-between">
          <label htmlFor="fund-amount" className="text-xs text-text-secondary">
            Deposit Amount (₦)
          </label>
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
            Zero Zeedle Fee
          </span>
        </div>
        <div className="relative flex h-16 items-center rounded-lg bg-[#0e0e13] px-4 shadow-inner transition-all focus-within:ring-1 focus-within:ring-brand">
          <span className="mr-2 select-none text-[28px] font-bold leading-[34px] text-brand">₦</span>
          <input
            id="fund-amount"
            inputMode="numeric"
            placeholder="0"
            value={amountText}
            onChange={(e) => format(e.target.value)}
            className="tabular w-full bg-transparent text-[28px] font-bold leading-[34px] tracking-tight outline-none placeholder:text-text-muted"
          />
          <button
            type="button"
            aria-label="Clear amount"
            onClick={() => setAmountText('')}
            className="rounded-full p-1 text-text-secondary hover:text-text-primary"
          >
            <Icon name="cancel" size={18} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 px-1 text-text-secondary">
          <Icon name="info" size={15} />
          <p className="text-[11px]">Min ₦100 • Max ₦10,000,000 • Integer amounts only</p>
        </div>
        <div className="pt-1">
          <span className="mb-2.5 block text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            Quick Select Amount
          </span>
          <div className="grid grid-cols-3 gap-2">
            {CHIPS.map((chip) => {
              const selected = naira === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setAmountText(chip.toLocaleString('en-NG'))}
                  className={`tabular flex h-11 items-center justify-center rounded-lg px-2 text-xs transition-all active:scale-95 ${
                    selected
                      ? 'bg-brand/20 font-semibold text-[#bcc2ff] shadow-[0_0_16px_rgba(91,110,245,0.25)]'
                      : 'bg-elevated shadow-sm hover:bg-hover'
                  }`}
                >
                  ₦{chip.toLocaleString()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-full space-y-2.5 rounded-xl bg-[#1f1f25] p-3.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-text-secondary">Supported Payment Channels</span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-credit">
            <span className="h-1.5 w-1.5 rounded-full bg-credit" />
            Channels Operational
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5 rounded-lg bg-elevated px-2.5 py-1.5 text-[11px] shadow-sm">
            <span className="text-brand">
              <Icon name="credit_card" size={15} />
            </span>
            <span>Cards (Mastercard / Visa / Verve)</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-elevated px-2.5 py-1.5 text-[11px] shadow-sm">
            <span className="text-credit">
              <Icon name="account_balance" size={15} />
            </span>
            <span>Bank Transfer</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-elevated px-2.5 py-1.5 text-[11px] shadow-sm">
            <span className="text-[#bcc2ff]">
              <Icon name="pin" size={15} />
            </span>
            <span>USSD (*737#, etc.)</span>
          </div>
        </div>
      </div>

      <div className="flex w-full items-start gap-3 rounded-xl bg-elevated p-3.5 shadow-md">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1f1f25] text-[#bcc2ff]">
          <Icon name="security" size={20} filled />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-semibold">Paystack Secure Gateway</span>
            <span className="text-credit">
              <Icon name="lock" size={14} />
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-text-secondary">
            You will be redirected to Paystack to complete payment securely. Zeedle never sees your
            card details. PCI-DSS compliant collection gateway.
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={submit}
          disabled={fund.isPending}
          className="btn-primary flex h-12 items-center justify-center gap-2 shadow-lg"
        >
          <span>
            {fund.isPending
              ? 'Redirecting to Paystack…'
              : `Proceed to Paystack (${naira > 0 ? `₦${naira.toLocaleString('en-NG')}` : '₦0'})`}
          </span>
          <Icon name="open_in_new" size={18} />
        </button>
        {error ? (
          <p role="alert" className="text-center text-sm text-debit">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-center gap-2 px-3 py-2 text-center text-text-secondary">
          <span className="shrink-0 animate-pulse text-credit">
            <Icon name="sync" size={16} />
          </span>
          <p className="text-[11px]">
            Your wallet balance will update automatically via secure webhook upon payment
            confirmation.
          </p>
        </div>
      </div>
    </main>
  );
}
