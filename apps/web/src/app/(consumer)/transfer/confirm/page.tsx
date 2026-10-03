'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/brand';
import { problemDetail } from '@/lib/api';
import { newIdempotencyKey, useTransfer, useWallet } from '@/lib/hooks';
import { saveRecentRecipient } from '@/lib/recents';
import { useAuthStore } from '@/stores/auth-store';

interface Draft {
  recipientId: string;
  amount: number;
  narration?: string;
  idempotencyKey: string;
  recipientName: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'finger', '0', 'back'];

export default function TransferConfirmPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const wallet = useWallet();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<{ referenceId: string } | null>(null);
  const transfer = useTransfer();

  useEffect(() => {
    const raw = sessionStorage.getItem('zeedle-transfer-draft');
    if (!raw) {
      router.replace('/transfer');
      return;
    }
    setDraft(JSON.parse(raw) as Draft);
  }, [router]);

  async function submit() {
    if (!draft || pin.length !== 4 || transfer.isPending) return;
    setError('');
    try {
      const result = await transfer.mutateAsync({ ...draft, pin });
      saveRecentRecipient({ id: draft.recipientId, name: draft.recipientName });
      setReceipt({ referenceId: result.referenceId });
      sessionStorage.removeItem('zeedle-transfer-draft');
    } catch (err) {
      setPin('');
      setError(await problemDetail(err));
      const status = (err as { response?: { status: number } })?.response?.status;
      if (status !== 401 && status !== 423) {
        setDraft((d) => (d ? { ...d, idempotencyKey: newIdempotencyKey() } : d));
      }
    }
  }

  async function copyId() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft.recipientId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — selection still works via truncate display.
    }
  }

  if (!draft) {
    return (
      <main className="px-4 pt-20">
        <p className="text-sm text-text-secondary">Loading…</p>
      </main>
    );
  }

  if (receipt) {
    return (
      <main className="app-column flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-credit/10 text-3xl text-credit">
          <Icon name="check_circle" size={32} />
        </span>
        <h1 className="text-xl font-semibold">Ledger Updated</h1>
        <p className="tabular text-3xl font-bold">
          ₦{draft.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </p>
        <p className="max-w-full truncate font-mono text-[11px] text-text-muted">{receipt.referenceId}</p>
        <button type="button" onClick={() => router.replace('/dashboard')} className="btn-primary mt-2">
          Back to Dashboard
        </button>
      </main>
    );
  }

  const newBalance = wallet.data ? wallet.data.balanceKobo / 100 - draft.amount : null;
  const complete = pin.length === 4;

  return (
    <main className="app-column flex min-h-screen flex-col bg-surface px-4 pb-24 pt-20">
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-elevated text-brand">
            <Icon name="send_money" size={16} />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-secondary">Step 4 of 4</p>
            <h2 className="text-[15px] font-semibold">Transfer Verification</h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-credit/15 px-2.5 py-1 text-credit">
          <Icon name="verified_user" size={14} />
          <span className="text-[11px] font-medium">Encrypted v4</span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-[#1b1b20] p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-hover font-bold text-brand">
            {draft.recipientName
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{draft.recipientName}</p>
            <p className="font-mono text-[11px] text-text-secondary">
              zeedle.me/@{draft.recipientName.split(' ')[0]?.toLowerCase()}
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-credit">Pending PIN</span>
      </div>

      <div className="rounded-t-2xl bg-elevated pb-4 pt-1 shadow-2xl">
        <div className="flex w-full justify-center py-2">
          <div className="h-1 w-12 rounded-full bg-[#35343a]" />
        </div>
        <div className="px-4 pb-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Confirm Transfer</h2>
              <p className="mt-0.5 text-sm text-text-secondary">
                Review transaction details and authorize with your 4-digit PIN.
              </p>
            </div>
            <span className="mt-1 text-brand">
              <Icon name="shield_lock" size={22} filled />
            </span>
          </div>
        </div>

        <div className="px-4 py-2">
          <div className="flex flex-col gap-3 rounded-xl bg-[#1f1f25] p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-text-secondary">Transfer Total</span>
              <span className="tabular text-[28px] font-bold leading-[34px] tracking-tight">
                ₦{draft.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-px w-full bg-[#35343a]" />
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Recipient ID</span>
                <button
                  type="button"
                  onClick={copyId}
                  title="Copy Recipient ID"
                  className="flex items-center gap-1.5 rounded bg-hover px-2 py-0.5 transition-all hover:bg-[#35343a] active:scale-95"
                >
                  <span className="max-w-[170px] truncate font-mono text-[11px] text-text-secondary">
                    {draft.recipientId.slice(0, 8)}...{draft.recipientId.slice(-3)}
                  </span>
                  <span className="text-brand">
                    <Icon name={copied ? 'check' : 'content_copy'} size={13} />
                  </span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Recipient Type</span>
                <span className="flex items-center gap-1 text-sm">
                  <span className="text-credit">
                    <Icon name="account_balance_wallet" size={15} />
                  </span>
                  Zeedle Peer Wallet
                </span>
              </div>
              {draft.narration ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Narration</span>
                  <span className="max-w-[210px] truncate text-right text-sm">{draft.narration}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Fee</span>
                <span className="rounded-full bg-credit/20 px-2 py-0.5 text-xs font-medium text-credit">
                  ₦0.00 (Zero Fee)
                </span>
              </div>
              <div className="h-px w-full bg-[#35343a]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Total Debit Amount</span>
                <span className="tabular text-sm font-semibold">
                  ₦{draft.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-secondary">New Balance After Transfer</span>
                <span className="tabular text-[11px] font-medium text-credit">
                  {newBalance === null
                    ? '…'
                    : `₦${newBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center px-4 pb-1 pt-2">
          <h3 className="text-[15px] font-semibold">Enter 4-Digit Transaction PIN</h3>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            Uses secure native keyboard authentication
          </p>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            aria-label="Transaction PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="tabular mt-2 h-10 w-40 rounded-lg bg-[#0e0e13] text-center text-lg tracking-[0.5em] focus:outline-none"
          />
          <div className="mt-3.5 flex items-center justify-center gap-3.5" aria-hidden>
            {[0, 1, 2, 3].map((i) =>
              pin.length > i ? (
                <div key={i} className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1f1f25]">
                  <div className="h-3.5 w-3.5 rounded-full bg-brand shadow-[0_0_8px_rgba(91,110,245,0.6)]" />
                </div>
              ) : i === pin.length ? (
                <div key={i} className="relative flex h-11 w-11 items-center justify-center rounded-lg bg-elevated">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-[#35343a]" />
                </div>
              ) : (
                <div key={i} className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1f1f25]">
                  <div className="h-3 w-3 rounded-full bg-[#35343a]" />
                </div>
              ),
            )}
          </div>
          <div className="mt-3.5 flex w-full items-start gap-2 rounded-lg bg-elevated/60 p-2.5">
            <span className="mt-0.5 shrink-0 text-debit">
              <Icon name="info" size={16} />
            </span>
            <p className="text-[11px] leading-relaxed text-text-secondary">
              <span className="font-medium text-debit">3 attempts allowed</span> before 30-minute
              lockout. PIN is hashed with bcrypt cost 12.
            </p>
          </div>
          {error ? (
            <p role="alert" className="mt-2 text-center text-sm text-debit">
              {error}
            </p>
          ) : null}
        </div>

        <div className="px-4 py-2">
          <div className="mx-auto grid max-w-[320px] grid-cols-3 gap-2">
            {KEYS.map((key) =>
              key === 'finger' ? (
                <span key={key} className="flex h-12 items-center justify-center text-text-secondary">
                  <Icon name="fingerprint" size={24} />
                </span>
              ) : key === 'back' ? (
                <button
                  key={key}
                  type="button"
                  aria-label="Backspace"
                  onClick={() => setPin((p) => p.slice(0, -1))}
                  className="flex h-12 items-center justify-center rounded-lg bg-[#1f1f25] text-text-secondary transition-colors active:bg-[#35343a]"
                >
                  <Icon name="backspace" size={20} />
                </button>
              ) : (
                <button
                  key={key}
                  type="button"
                  onClick={() => pin.length < 4 && setPin((p) => p + key)}
                  className="flex h-12 items-center justify-center rounded-lg bg-[#1f1f25] text-[28px] font-semibold transition-colors active:bg-[#35343a]"
                >
                  {key}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="px-4 pb-2 pt-2">
          <button
            type="button"
            onClick={submit}
            disabled={!complete || transfer.isPending}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-[9px] text-sm font-semibold shadow-[0_4px_16px_rgba(91,110,245,0.2)] transition-all active:scale-[0.99] disabled:cursor-not-allowed ${
              complete ? 'bg-credit text-[#003915]' : 'bg-brand text-white'
            }`}
          >
            {transfer.isPending ? (
              <span className="flex items-center gap-2">
                <Icon name="progress_activity" size={18} />
                <span>Encrypting &amp; Dispatching…</span>
              </span>
            ) : complete ? (
              <span className="flex items-center gap-2">
                <Icon name="verified" size={18} />
                <span>Authorize ₦{draft.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} Transfer</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon name="lock" size={18} />
                <span>Authorize ₦{draft.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} Transfer</span>
              </span>
            )}
          </button>
        </div>
        <div className="px-4 pb-2 text-center">
          <p className="truncate font-mono text-[11px] text-text-secondary">
            x-idempotency-key: {draft.idempotencyKey}
          </p>
          <p className="mt-1 text-[11px] text-text-muted">Signed in as {user?.email}</p>
        </div>
      </div>
    </main>
  );
}
