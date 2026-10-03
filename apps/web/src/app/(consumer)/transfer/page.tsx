'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/brand';
import { loadRecentRecipients, type RecentRecipient } from '@/lib/recents';
import { newIdempotencyKey, useResolveRecipient, useWallet } from '@/lib/hooks';

const QUICK = [2000, 5000, 10000];

export default function TransferPage() {
  const router = useRouter();
  const wallet = useWallet();
  const { result, checking, resolveByAccountNumber, reset } = useResolveRecipient();
  const [recipientNumber, setRecipientNumber] = useState('');
  const [recipientError, setRecipientError] = useState('');
  const [amountText, setAmountText] = useState('');
  const [narration, setNarration] = useState('');
  const [formError, setFormError] = useState('');
  const [recents] = useState<RecentRecipient[]>(() =>
    typeof window === 'undefined' ? [] : loadRecentRecipients(),
  );

  const amount = Number(amountText.replace(/,/g, ''));
  const balanceNaira = wallet.data ? Math.floor(wallet.data.balanceKobo / 100) : 0;

  async function checkRecipient(raw: string) {
    setRecipientError('');
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      reset();
      return;
    }
    const outcome = await resolveByAccountNumber(digits);
    if (outcome === 'invalid') {
      setRecipientError("That number doesn't look right — check for typos and try again.");
    } else if (!outcome) {
      setRecipientError('No Zeedle account with this number. Transfers to unknown accounts are rejected.');
    } else if (digits === wallet.data?.accountNumber) {
      reset();
      setRecipientError("That's your own number — you can't send to yourself.");
    }
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRecipientNumber(text.replace(/\D/g, '').slice(0, 10));
        await checkRecipient(text);
      }
    } catch {
      // Clipboard blocked — user types manually.
    }
  }

  function formatAmount(raw: string) {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setAmountText('');
      return;
    }
    const capped = Math.min(Number(digits), 10000000);
    setAmountText(capped.toLocaleString('en-US'));
  }

  function submit() {
    setFormError('');
    if (!recipientNumber.replace(/\D/g, '')) {
      setFormError('Enter a recipient account number.');
      return;
    }
    if (!result?.found || !result.userId || !result.accountNumber) {
      setFormError('Resolve a valid recipient first.');
      return;
    }
    if (!Number.isInteger(amount) || amount < 100) {
      setFormError('Enter at least ₦100.');
      return;
    }
    sessionStorage.setItem(
      'zeedle-transfer-draft',
      JSON.stringify({
        recipientId: result.userId,
        recipientAccountNumber: result.accountNumber,
        amount,
        narration: narration.trim() || undefined,
        idempotencyKey: newIdempotencyKey(),
        recipientName: result.name,
      }),
    );
    router.push('/transfer/confirm');
  }

  return (
    <main className="app-column flex min-h-screen flex-col gap-4 bg-surface px-4 pb-24 pt-20">
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-text-primary transition-colors hover:bg-hover active:scale-95"
        >
          <Icon name="arrow_back" size={20} />
        </button>
        <div className="flex items-center gap-1.5 rounded-full bg-elevated px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-credit" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            Step 1 of 2
          </span>
        </div>
      </div>

      <div className="space-y-0.5">
        <h1 className="text-lg font-semibold tracking-tight">Send Money</h1>
        <p className="text-sm text-text-secondary">Instant zero-fee transfer to any Zeedle wallet</p>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-[#1b1b20] p-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1f1f25] text-brand">
            <Icon name="account_balance_wallet" size={18} />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[11px] uppercase tracking-wide text-text-secondary">Available to send</span>
            <span className="tabular truncate text-sm font-semibold">
              {wallet.data ? `₦${balanceNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '…'}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-credit/10 px-2.5 py-1">
          <Icon name="verified_user" size={14} />
          <span className="text-[11px] font-medium text-credit">Cleared</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="recipient" className="flex items-center gap-1.5 text-xs font-medium">
            <span>Recipient Zeedle account number</span>
            <span className="text-text-secondary" title="10-digit Zeedle account number — found on the recipient's dashboard">
              <Icon name="info" size={16} />
            </span>
          </label>
          <button
            type="button"
            onClick={paste}
            className="flex cursor-pointer items-center gap-0.5 text-[11px] text-brand hover:underline"
          >
            <Icon name="qr_code_scanner" size={14} />
            Scan
          </button>
        </div>
        <div className="relative flex items-center">
          <input
            id="recipient"
            spellCheck={false}
            inputMode="numeric"
            maxLength={10}
            placeholder="e.g. 0123456789"
            value={recipientNumber}
            onChange={(e) => {
              setRecipientNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
              setRecipientError('');
            }}
            onBlur={(e) => void checkRecipient(e.target.value)}
            className="tabular h-12 w-full rounded-lg bg-[#0e0e13] px-4 text-[15px] font-semibold tracking-[0.2em] shadow-inner focus:bg-[#1b1b20] focus:outline-none"
          />
          <button
            type="button"
            onClick={paste}
            className="absolute right-2 rounded bg-[#1f1f25] px-2.5 py-1 text-[11px] uppercase tracking-wider text-text-secondary transition-colors hover:text-text-primary"
          >
            Paste
          </button>
        </div>
        {recipientError ? (
          <p className="text-xs text-debit">{recipientError}</p>
        ) : checking ? (
          <p className="text-xs text-text-secondary">Resolving recipient…</p>
        ) : result?.found ? (
          <p className="text-xs text-credit">✓ {result.name}</p>
        ) : (
          <p className="flex items-center gap-1 text-[11px] text-text-secondary">
            <span className="shrink-0 text-brand">
              <Icon name="shield" size={14} />
            </span>
            Enter the recipient&apos;s 10-digit Zeedle account number. Self-transfers are rejected.
          </p>
        )}

        {recents.length ? (
          <div className="pt-1">
            <span className="text-[11px] uppercase tracking-wider text-text-secondary">
              Recent Recipients
            </span>
            <div className="no-scrollbar mt-1.5 flex items-center gap-2 overflow-x-auto pb-0.5">
              {recents.map((recent) => (
                <button
                  key={recent.id}
                  type="button"
                  onClick={() => {
                    if (recent.accountNumber) {
                      setRecipientNumber(recent.accountNumber);
                      void checkRecipient(recent.accountNumber);
                    }
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1f1f25] px-3 py-1.5 text-left transition-colors hover:bg-hover"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20 text-[11px] font-bold text-brand">
                    {recent.name[0]?.toUpperCase()}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs font-medium leading-none">{recent.name.split(' ')[0]}</span>
                    <span className="tabular text-[11px] text-text-secondary">
                      {recent.accountNumber ? `••${recent.accountNumber.slice(-4)}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 pt-1">
        <label htmlFor="amount" className="block text-xs font-medium">
          Amount to Send (₦)
        </label>
        <div className="flex flex-col justify-center rounded-xl bg-[#0e0e13] p-4 shadow-inner">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[28px] font-bold text-brand">₦</span>
            <input
              id="amount"
              inputMode="numeric"
              placeholder="0"
              value={amountText}
              onChange={(e) => formatAmount(e.target.value)}
              className="tabular w-full bg-transparent text-[28px] font-bold leading-[34px] tracking-tight focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-text-secondary">Min: ₦100 • Max: ₦10,000,000</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#bcc2ff]">
              Integer amounts only
            </span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 pt-1">
          {QUICK.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => setAmountText((quick).toLocaleString('en-US'))}
              className="rounded-lg bg-[#1f1f25] px-1 py-2 text-center transition-colors hover:bg-hover"
            >
              <span className="tabular text-xs font-medium">+₦{quick.toLocaleString()}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAmountText(balanceNaira.toLocaleString('en-US'))}
            className="rounded-lg bg-elevated px-1 py-2 text-center text-xs font-semibold text-brand transition-colors hover:bg-hover"
          >
            Max
          </button>
        </div>
      </div>

      <div className="space-y-1 pt-1">
        <div className="flex items-center justify-between">
          <label htmlFor="narration" className="text-xs font-medium">
            Narration (Optional)
          </label>
          <span className="tabular text-[11px] text-text-secondary">{narration.length}/140</span>
        </div>
        <input
          id="narration"
          maxLength={140}
          placeholder="What's this for? (e.g. Dinner split, Project fee)"
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
          className="field !bg-[#0e0e13] shadow-inner focus:!bg-[#1b1b20]"
        />
      </div>

      <div className="space-y-2 rounded-xl bg-[#1b1b20] p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-text-secondary">Transfer Fee</span>
            <span className="rounded bg-credit/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-credit">
              0% Zero-Fee
            </span>
          </div>
          <span className="tabular text-sm font-medium text-credit">₦0.00</span>
        </div>
        <div className="my-1 h-px w-full bg-[#35343a]" />
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold">Total Debit</span>
          <span className="tabular text-[15px] font-bold">
            ₦{(Number.isInteger(amount) && amount > 0 ? amount : 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-debit">
          {formError}
        </p>
      ) : null}

      <div className="space-y-2 pt-2">
        <button type="button" onClick={submit} className="btn-primary flex h-12 items-center justify-center gap-2 shadow-md">
          <span>Continue to Confirmation</span>
          <Icon name="arrow_forward" size={18} />
        </button>
        <div className="flex items-center justify-center gap-1.5 pt-1 text-center">
          <span className="text-credit">
            <Icon name="lock" size={14} />
          </span>
          <span className="text-[11px] text-text-secondary">
            Protected by 24h idempotency key &amp; double-entry ledger
          </span>
        </div>
      </div>
    </main>
  );
}
