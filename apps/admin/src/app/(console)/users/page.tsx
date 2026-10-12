'use client';

import { useState } from 'react';
import { isValidAccountNumber } from '@zeedle/shared-types';
import { Icon } from '@/components/brand';
import { problemDetail } from '@/lib/api';
import {
  useAccountResolution,
  useAdminUsers,
  useFreezeWallet,
  type AdminUserView,
} from '@/lib/hooks';

function naira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

export default function UsersPage() {
  const [number, setNumber] = useState('');
  const [localError, setLocalError] = useState('');
  const { resolution, resolve, reset } = useAccountResolution();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [inspected, setInspected] = useState<AdminUserView | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');
  const users = useAdminUsers(search, page);
  const freeze = useFreezeWallet();

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

  async function runFreezeAction(target: AdminUserView, action: 'FREEZE' | 'UNFREEZE') {
    setActionError('');
    if (reason.trim().length < 5) {
      setActionError('A reason of at least 5 characters is required — every freeze is audited.');
      return;
    }
    try {
      await freeze.mutateAsync({ userId: target.id, action, reason: reason.trim() });
      setReason('');
      setInspected((current) =>
        current && current.id === target.id
          ? {
              ...current,
              wallet: current.wallet
                ? { ...current.wallet, isActive: action === 'UNFREEZE' }
                : current.wallet,
            }
          : current,
      );
    } catch (error) {
      setActionError(await problemDetail(error));
    }
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
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold">Indexed Sovereign Profiles</span>
            <span className="rounded-full bg-hover px-2 py-0.5 text-[11px] text-text-secondary">
              {users.data?.total ?? 0} total
            </span>
          </div>
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-text-muted">
              <Icon name="search" size={16} />
            </span>
            <input
              aria-label="Search users"
              placeholder="Search email, name, account number…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-10 w-72 rounded-lg bg-elevated pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-elevated shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-surface text-[11px] uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 font-medium">User / Customer</th>
                  <th className="px-3 py-3 font-medium">Account & UUID</th>
                  <th className="px-3 py-3 font-medium">Balance</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {users.isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-text-secondary">
                      Loading profiles…
                    </td>
                  </tr>
                ) : !users.data?.items.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-text-secondary">
                      No profiles match.
                    </td>
                  </tr>
                ) : (
                  users.data.items.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => {
                        setInspected(u);
                        setReason('');
                        setActionError('');
                      }}
                      className="cursor-pointer transition-colors hover:bg-hover/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">
                            {`${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase()}
                          </span>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-semibold">
                              {u.firstName} {u.lastName}
                            </span>
                            <span className="truncate text-[11px] text-text-muted">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="tabular font-mono text-sm font-bold text-brand">
                            {u.wallet?.accountNumber ?? '—'}
                          </span>
                          <span className="max-w-[90px] truncate font-mono text-[11px] text-text-muted">
                            {u.id.slice(0, 12)}…
                          </span>
                        </div>
                      </td>
                      <td className="tabular px-3 py-3 text-sm font-semibold">
                        {u.wallet ? naira(u.wallet.balanceKobo) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        {u.wallet?.isActive === false ? (
                          <span className="inline-flex w-max items-center gap-1 rounded-full bg-debit/20 px-2 py-0.5 text-[11px] font-semibold text-debit">
                            <span className="h-1.5 w-1.5 rounded-full bg-debit" />
                            FROZEN
                          </span>
                        ) : (
                          <span className="inline-flex w-max items-center gap-1 rounded-full bg-credit/20 px-2 py-0.5 text-[11px] font-semibold text-credit">
                            <span className="h-1.5 w-1.5 rounded-full bg-credit" />
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="rounded bg-brand/20 px-2 py-1 text-xs font-medium text-brand">
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
              Showing {users.data?.items.length ?? 0} of{' '}
              <strong className="text-text-primary">{users.data?.total ?? 0}</strong>
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
                disabled={!users.data || page * 20 >= users.data.total}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg bg-surface px-3 py-1.5 transition-colors hover:bg-hover disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      {inspected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0e13]/80 p-4 backdrop-blur-md">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl bg-elevated p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand">
                  {`${inspected.firstName[0] ?? ''}${inspected.lastName[0] ?? ''}`.toUpperCase()}
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold">
                    {inspected.firstName} {inspected.lastName}
                  </h2>
                  <span className="text-[11px] text-text-muted">{inspected.email}</span>
                </div>
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
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted">Phone</span>
                <span>{inspected.phone ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted">Zeedle account</span>
                <span className="tabular font-mono font-semibold text-brand">
                  {inspected.wallet?.accountNumber ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted">Balance</span>
                <span className="tabular font-semibold">
                  {inspected.wallet ? naira(inspected.wallet.balanceKobo) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted">Wallet status</span>
                <span
                  className={`text-xs font-semibold ${inspected.wallet?.isActive === false ? 'text-debit' : 'text-credit'}`}
                >
                  {inspected.wallet?.isActive === false ? 'FROZEN' : 'ACTIVE'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted">User ID</span>
                <span className="max-w-[220px] truncate font-mono text-[11px] text-text-muted">
                  {inspected.id}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wider text-text-muted">
                Operational Actions
              </span>
              <label htmlFor="freeze-reason" className="text-xs text-text-secondary">
                Reason (required — recorded in the audit log)
              </label>
              <input
                id="freeze-reason"
                placeholder="e.g. Suspected mule activity, ticket #4821"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-11 w-full rounded-lg bg-[#0e0e13] px-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              />
              {actionError ? (
                <p role="alert" className="text-sm text-debit">
                  {actionError}
                </p>
              ) : null}
              {inspected.wallet?.isActive === false ? (
                <button
                  type="button"
                  disabled={freeze.isPending}
                  onClick={() => void runFreezeAction(inspected, 'UNFREEZE')}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg bg-credit/15 text-sm font-semibold text-credit transition-colors hover:bg-credit/25 disabled:opacity-50"
                >
                  <Icon name="lock_open" size={18} />
                  <span>{freeze.isPending ? 'Working…' : 'Unfreeze Wallet Account'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={freeze.isPending}
                  onClick={() => void runFreezeAction(inspected, 'FREEZE')}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg border border-debit bg-transparent text-sm font-semibold text-debit transition-colors hover:bg-debit/10 disabled:opacity-50"
                >
                  <Icon name="lock_reset" size={18} />
                  <span>{freeze.isPending ? 'Working…' : 'Freeze Wallet Account'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
