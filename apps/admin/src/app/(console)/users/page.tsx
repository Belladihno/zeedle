'use client';

import { useState } from 'react';
import { isValidAccountNumber } from '@zeedle/shared-types';
import { Icon } from '@/components/brand';
import { useAccountResolution } from '@/lib/hooks';

export default function UsersPage() {
  const [number, setNumber] = useState('');
  const [localError, setLocalError] = useState('');
  const { resolution, resolve, reset } = useAccountResolution();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLocalError('');
    const digits = number.replace(/\D/g, '');
    if (!isValidAccountNumber(digits)) {
      reset();
      setLocalError("That number doesn't look right — check for typos and try again.");
      return;
    }
    await resolve(digits);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="rounded bg-brand/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand">
            TRD §14
          </span>
          <span className="h-1 w-1 rounded-full bg-text-muted" />
          <span className="text-[11px] text-text-muted">NDPA 2023 Enforced Retention</span>
        </div>
        <h1 className="text-xl font-semibold">Users & Support Lookup</h1>
        <p className="max-w-2xl text-sm text-text-secondary">
          Customer support investigation, wallet ledger status, and NDPA 2023 compliance
          oversight.
        </p>
      </div>

      <section className="relative flex flex-col gap-4 overflow-hidden rounded-xl bg-elevated p-4 shadow-md">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20 text-brand">
              <Icon name="manage_search" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold">Account Number Resolution Panel</span>
              <span className="text-[11px] text-text-muted">
                10-digit Zeedle check-digit validator — typos die before the network call
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-text-secondary">
            <Icon name="verified" size={16} />
            <span>Local Check-Digit Validation Engine Active</span>
          </div>
        </div>

        <form onSubmit={(e) => void submit(e)} className="grid grid-cols-1 items-end gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-1 lg:col-span-7">
            <label htmlFor="account-number" className="flex items-center justify-between text-xs font-medium text-text-secondary">
              <span>10-Digit Zeedle Account Number</span>
              {number.replace(/\D/g, '').length === 10 ? (
                <span
                  className={`text-[11px] font-medium ${
                    isValidAccountNumber(number.replace(/\D/g, ''))
                      ? 'text-credit'
                      : 'text-debit'
                  }`}
                >
                  {isValidAccountNumber(number.replace(/\D/g, '')) ? 'VALID' : 'INVALID'}
                </span>
              ) : null}
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-text-muted">
                <Icon name="tag" size={18} />
              </span>
              <input
                id="account-number"
                inputMode="numeric"
                maxLength={10}
                placeholder="0123456789"
                value={number}
                onChange={(e) => {
                  setNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                  setLocalError('');
                }}
                className="tabular h-12 w-full rounded-lg bg-[#0e0e13] py-3 pl-10 pr-4 text-sm font-semibold tracking-[0.2em] shadow-inner focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <div className="lg:col-span-5">
            <button
              type="submit"
              disabled={resolution.state === 'checking'}
              className="btn-primary flex h-12 items-center justify-center gap-2"
            >
              <Icon name="travel_explore" size={18} />
              <span>{resolution.state === 'checking' ? 'Resolving…' : 'Resolve Profile'}</span>
            </button>
          </div>
        </form>

        {localError ? (
          <p role="alert" className="text-sm text-debit">
            {localError}
          </p>
        ) : resolution.state === 'found' ? (
          <div className="flex items-center gap-3 rounded-lg bg-surface p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand">
              {resolution.name
                ?.split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{resolution.name}</span>
              <span className="tabular text-[11px] text-text-muted">
                Zeedle acct {resolution.accountNumber}
              </span>
            </div>
            <span className="badge badge-success ml-auto">Resolved</span>
          </div>
        ) : resolution.state === 'missing' ? (
          <p className="text-sm text-debit">
            No active wallet found for this number. Unknown, deactivated, and deleted accounts
            all resolve the same way by design.
          </p>
        ) : null}

        <div className="flex items-center gap-1 text-[11px] text-text-muted">
          <Icon name="info" size={14} />
          <span>
            Contact data, full ledger drawer, and freeze actions unlock with the admin resolve +
            wallet management endpoints — API gap §5.2 in ADMIN-FRONTEND.md. This panel uses
            the public name-only resolve in the meantime.
          </span>
        </div>
      </section>
    </div>
  );
}
