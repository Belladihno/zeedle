'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Icon } from '@/components/brand';
import { AppHeader } from '@/components/headers';
import { apiDelete, apiPatch, apiPost, problemDetail } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export default function SettingsPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const profileForm = useForm<{ firstName?: string; lastName?: string; phone?: string }>();
  const setPinForm = useForm<{ pin: string }>();
  const changePinForm = useForm<{ currentPin: string; newPin: string }>();

  async function saveProfile(values: { firstName?: string; lastName?: string; phone?: string }) {
    setError('');
    setMessage('');
    try {
      const patch: Record<string, string> = {};
      if (values.firstName?.trim()) patch.firstName = values.firstName.trim();
      if (values.lastName?.trim()) patch.lastName = values.lastName.trim();
      if (values.phone?.trim()) patch.phone = values.phone.trim();
      await apiPatch('users/me', patch);
      setMessage('Profile updated.');
      setEditingProfile(false);
    } catch (err) {
      setError(await problemDetail(err));
    }
  }

  async function setPin(values: { pin: string }) {
    setError('');
    setMessage('');
    try {
      await apiPost('users/pin', values);
      setMessage('Transaction PIN set.');
      setPinForm.reset();
    } catch (err) {
      setError(await problemDetail(err));
    }
  }

  async function changePin(values: { currentPin: string; newPin: string }) {
    setError('');
    setMessage('');
    try {
      await apiPatch('users/pin', values);
      setMessage('Transaction PIN changed.');
      changePinForm.reset();
      setPinModalOpen(false);
    } catch (err) {
      setError(await problemDetail(err));
    }
  }

  async function deleteAccount() {
    if (confirmDelete.trim().toUpperCase() !== 'DELETE') return;
    try {
      await apiDelete('users/me');
      clearAuth();
      router.replace('/register');
    } catch (err) {
      setError(await problemDetail(err));
    }
  }

  async function logout() {
    try {
      await apiPost('auth/logout', {});
    } catch {
      // Session already invalid — still clear local state.
    }
    clearAuth();
    router.replace('/login');
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col gap-4 bg-surface px-4 pb-24 pt-20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">Settings &amp; Security</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-credit/15 px-2.5 py-1 text-[11px] font-medium text-credit">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-credit" />
              Vault Guarded
            </span>
          </div>
          <p className="text-sm text-text-secondary">Manage profile, PIN security, and account compliance</p>
        </div>

        <div className="relative flex flex-col gap-4 overflow-hidden rounded-xl bg-[#1f1f25] p-4 shadow-sm">
          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand/5 blur-2xl" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/20 text-lg text-brand">
                  {user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '••'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1f1f25]">
                  <span className="text-credit">
                    <Icon name="verified" size={13} filled />
                  </span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold">
                  {user ? `${user.firstName} ${user.lastName}` : '…'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-credit">
                  Verified Tier 2
                </span>
              </div>
            </div>
            <div className="rounded-md bg-elevated px-2 py-1 text-[11px] uppercase tracking-wider text-text-secondary">
              BVN Linked
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <div className="flex items-center justify-between rounded-lg bg-[#1b1b20] p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="shrink-0 text-text-muted">
                  <Icon name="mail" size={18} />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] text-text-muted">Primary Email</span>
                  <span className="truncate text-sm">{user?.email}</span>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full bg-[#35343a] px-2 py-0.5 text-[11px] text-text-secondary">
                Locked
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#1b1b20] p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="shrink-0 text-text-muted">
                  <Icon name="phone_iphone" size={18} />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] text-text-muted">Phone Number</span>
                  <span className="tabular truncate text-sm">{user?.phone ?? '—'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProfile((v) => !v)}
                className="rounded-md bg-elevated px-2.5 py-1 text-xs text-brand transition-colors hover:bg-hover"
              >
                Edit
              </button>
            </div>
          </div>

          {editingProfile ? (
            <form onSubmit={profileForm.handleSubmit(saveProfile)} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="First name" className="field" {...profileForm.register('firstName')} />
                <input placeholder="Last name" className="field" {...profileForm.register('lastName')} />
              </div>
              <input placeholder="Phone" type="tel" className="field" {...profileForm.register('phone')} />
              <button type="submit" className="btn-secondary flex h-11 items-center justify-center gap-1.5 shadow-sm">
                <span className="text-brand">
                  <Icon name="manage_accounts" size={18} />
                </span>
                Update Profile
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setEditingProfile(true)}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-elevated text-sm shadow-sm transition-colors hover:bg-hover"
            >
              <span className="text-brand">
                <Icon name="manage_accounts" size={18} />
              </span>
              Update Profile
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-xl bg-[#1f1f25] p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand">
                <Icon name="lock" size={20} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[15px] font-semibold">Transaction PIN</h2>
                <span className="text-[11px] text-text-muted">Bcrypt cost 12 ledger hash</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-credit/15 px-2 py-1 text-[11px] text-credit">
              <Icon name="check_circle" size={13} filled />
              Active
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            4-digit PIN required for all wallet transfers and credential updates.
          </p>
          <button
            type="button"
            onClick={() => setPinModalOpen(true)}
            className="flex w-full items-center justify-between rounded-lg bg-[#1b1b20] p-3 text-left transition-colors hover:bg-hover"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="h-2.5 w-2.5 rounded-full bg-brand" />
                ))}
              </div>
              <span className="text-sm">Change 4-Digit PIN</span>
            </div>
            <span className="text-text-muted">
              <Icon name="chevron_right" size={20} />
            </span>
          </button>
          <div className="flex items-center gap-2 rounded-lg bg-[#0e0e13] p-2.5 text-text-muted">
            <span className="shrink-0 text-debit">
              <Icon name="shield" size={16} />
            </span>
            <span className="text-[11px]">3 failed attempts triggers automatic 30-minute security lockout.</span>
          </div>
          <form onSubmit={setPinForm.handleSubmit(setPin)} className="flex gap-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="First-time PIN"
              aria-label="Set PIN for first time"
              className="field tabular"
              {...setPinForm.register('pin')}
            />
            <button type="submit" className="btn-secondary !h-12 !w-auto shrink-0 px-4">
              Set
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-3.5 rounded-xl bg-[#1f1f25] p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-brand">
              <Icon name="policy" size={20} />
            </span>
            <h2 className="text-[15px] font-semibold">Session &amp; Compliance</h2>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-lg bg-[#1b1b20] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-text-muted">
                  <Icon name="timer" size={17} />
                </span>
                <span className="text-sm text-text-secondary">Access Token</span>
              </div>
              <span className="tabular text-right text-[11px] font-medium">15m (RS256 In-Memory)</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#1b1b20] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-text-muted">
                  <Icon name="cached" size={17} />
                </span>
                <span className="text-sm text-text-secondary">Refresh Rotation</span>
              </div>
              <span className="text-right text-[11px] font-medium">7-Day HttpOnly Secure</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#1b1b20] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-text-muted">
                  <Icon name="gavel" size={17} />
                </span>
                <span className="text-sm text-text-secondary">Regulatory Mandate</span>
              </div>
              <span className="text-right text-[11px] font-medium text-credit">NDPA 2023 • CBN 7-Yr</span>
            </div>
          </div>
          <button type="button" onClick={logout} className="btn-secondary">
            Log Out
          </button>
        </div>

        {message ? <p className="text-sm text-credit">{message}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-debit">
            {error}
          </p>
        ) : null}

        <div className="relative flex flex-col gap-3.5 overflow-hidden rounded-xl bg-debit/10 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-debit/20 text-debit">
              <Icon name="warning" size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-debit">Delete Account</h2>
              <span className="text-[11px] text-text-secondary">Permanent &amp; Irreversible</span>
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            Right to erasure under NDPA 2023. All personal identification is scrubbed. Under Central
            Bank of Nigeria (CBN) regulatory framework, immutable ledger ledgers are preserved in
            encrypted vault for 7 years.
          </p>
          <div className="flex flex-col gap-1.5 pt-1">
            <label htmlFor="delete-confirm" className="text-xs text-text-secondary">
              Type <span className="font-semibold tracking-wider text-debit">DELETE</span> to confirm
              irreversible closure
            </label>
            <div className="relative">
              <input
                id="delete-confirm"
                autoComplete="off"
                placeholder="DELETE"
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                className="field uppercase tracking-wider placeholder:text-text-muted/40"
              />
              {confirmDelete.trim().toUpperCase() === 'DELETE' ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-debit">
                  <Icon name="check" size={18} />
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            disabled={confirmDelete.trim().toUpperCase() !== 'DELETE'}
            onClick={deleteAccount}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm transition-all disabled:cursor-not-allowed disabled bg-transparent disabled:text-debit/40 disabled:opacity-60 enabled:bg-debit/15 enabled:text-debit enabled:hover:bg-debit/25"
          >
            <Icon name="delete_forever" size={18} />
            Permanently Delete Account
          </button>
        </div>
      </main>

      {pinModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex w-full max-w-[480px] flex-col gap-4 rounded-t-2xl bg-elevated p-5 shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Icon name="lock_reset" size={18} />
                </div>
                <h3 className="text-lg font-semibold">Update Transaction PIN</h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setPinModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f1f25] text-text-muted hover:text-text-primary"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <p className="text-sm text-text-secondary">
              Enter your current 4-digit PIN followed by your new security digits.
            </p>
            <form onSubmit={changePinForm.handleSubmit(changePin)} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-text-muted">Current PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="• • • •"
                  className="tabular h-11 rounded-lg bg-[#0e0e13] px-3 text-center text-lg tracking-widest focus:outline-none"
                  {...changePinForm.register('currentPin')}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-text-muted">New 4-Digit PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="• • • •"
                  className="tabular h-11 rounded-lg bg-[#0e0e13] px-3 text-center text-lg tracking-widest focus:outline-none"
                  {...changePinForm.register('newPin')}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setPinModalOpen(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex flex-1 items-center justify-center gap-1.5">
                  <Icon name="check" size={18} />
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
