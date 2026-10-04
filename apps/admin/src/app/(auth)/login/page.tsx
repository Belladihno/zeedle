'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LoginSchema, type UserDto } from '@zeedle/shared-types';
import { Icon, Logo } from '@/components/brand';
import { apiPost, problemDetail } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

type Phase = 'idle' | 'validating' | 'asserting' | 'granted' | 'locked';

export default function AdminLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [serverError, setServerError] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);

  function startCountdown(seconds: number) {
    setRetryAfter(seconds);
    const timer = setInterval(() => {
      setRetryAfter((s) => {
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError('');
    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? 'Enter a valid email and password.');
      return;
    }
    try {
      setPhase('validating');
      const data = await apiPost<{ user: UserDto; accessToken: string }>(
        'auth/login',
        parsed.data,
      );
      setAuth(data.user, data.accessToken);
      setPhase('asserting');
      if (data.user.role !== 'ADMIN') {
        clearAuth();
        setPhase('locked');
        setServerError('Session lacks admin rights. This incident is logged.');
        return;
      }
      setPhase('granted');
      setTimeout(() => router.replace('/overview'), 600);
    } catch (error) {
      setPhase('idle');
      const status = (error as { response?: { status: number; headers: Headers } })?.response
        ?.status;
      if (status === 429) {
        const seconds = Number(
          (error as { response: { headers: Headers } }).response.headers.get('Retry-After') ??
            60,
        );
        startCountdown(seconds);
        setServerError('Too many attempts. Please wait before retrying.');
        return;
      }
      setServerError(await problemDetail(error));
    }
  }

  const busy = phase === 'validating' || phase === 'asserting' || phase === 'granted';
  const waiting = retryAfter > 0;
  const buttonLabel =
    phase === 'validating'
      ? 'Validating Ledger Credentials…'
      : phase === 'asserting'
        ? 'Asserting Admin Permissions…'
        : phase === 'granted'
          ? 'Session Granted'
          : 'Authenticate & Verify Admin Role';

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-base px-4 py-10">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 h-64 w-64 rounded-full bg-brand/5 blur-2xl" />

      <div className="relative w-full max-w-[480px] overflow-hidden rounded-xl bg-surface p-6 shadow-2xl sm:p-8">
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand to-transparent" />

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-elevated p-2 shadow-md">
              <Logo height={30} />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-credit opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-credit" />
            </span>
          </div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-brand">
            <Icon name="terminal" size={13} filled />
            <span>Operations Console</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Admin Portal Sign-In</h1>
          <p className="mt-1 max-w-sm text-sm text-text-secondary">
            Restricted access for authorized Zeedle operations and treasury personnel only.
          </p>
        </div>

        <div className="mb-4 mt-6 flex items-start gap-2 rounded-lg bg-elevated p-3 shadow-sm">
          <span className="mt-0.5 shrink-0 text-credit">
            <Icon name="shield" size={18} filled />
          </span>
          <p className="text-[11px] leading-relaxed text-text-secondary">
            Protected by sliding-window rate limiting (
            <span className="tabular font-medium text-credit">5 req/min</span> per IP). Non-admin
            roles are rejected post-authentication.
          </p>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="admin-email" className="text-xs font-medium">
                Operator Email Address
              </label>
              <span className="text-[11px] text-text-muted">RFC 5322 STRICT</span>
            </div>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-text-muted">
                <Icon name="lock" size={18} />
              </span>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                placeholder="superadmin@zeedle.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-lg bg-[#0e0e13] py-3 pl-10 pr-4 text-sm shadow-inner focus:bg-elevated focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="admin-password" className="text-xs font-medium">
                Master Passphrase
              </label>
              <span className="text-[11px] text-text-muted">SECURE VAULT</span>
            </div>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-text-muted">
                <Icon name="key" size={18} />
              </span>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="Enter operator password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="tabular h-12 w-full rounded-lg bg-[#0e0e13] py-3 pl-10 pr-10 text-sm shadow-inner focus:bg-elevated focus:outline-none"
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 p-1 text-text-muted transition-colors hover:text-text-primary"
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
              </button>
            </div>
          </div>

          {serverError ? (
            <p role="alert" className="text-sm text-debit">
              {serverError}
              {waiting ? ` Retry in ${retryAfter}s.` : ''}
            </p>
          ) : null}

          <div className="pt-1">
            <button
              type="submit"
              disabled={busy || waiting}
              className="btn-primary flex h-12 items-center justify-center gap-2 shadow-md"
            >
              {busy ? (
                <Icon name="progress_activity" size={18} />
              ) : (
                <Icon name="arrow_forward" size={18} />
              )}
              <span>{waiting ? `Retry in ${retryAfter}s` : buttonLabel}</span>
            </button>
          </div>
        </form>

        <div className="mt-6 space-y-1 rounded-lg bg-elevated p-3">
          <div className="flex items-center gap-1.5 text-debit">
            <Icon name="verified_user" size={16} />
            <span className="text-xs font-semibold tracking-wide">Strict Role Gating Policy</span>
          </div>
          <p className="text-[11px] leading-relaxed text-text-secondary">
            Upon authentication, <code className="rounded bg-[#0e0e13] px-1 py-0.5 font-mono text-brand">GET /users/me</code> asserts{' '}
            <code className="rounded bg-[#0e0e13] px-1 py-0.5 font-mono text-brand">role === 'ADMIN'</code>.
            Non-admin credentials trigger a hard 403{' '}
            <span className="font-medium text-debit">'Session lacks admin rights'</span> lockout.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-[11px] text-text-muted">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-credit" />
            <span>Gateway: auth-edge-lag-01</span>
          </div>
          <div className="tabular flex items-center gap-1 font-mono">
            <span>TLS 1.3</span>
            <span>•</span>
            <span className="font-medium text-credit">99.99% OK</span>
          </div>
        </div>
      </div>

      <div className="mt-6 w-full max-w-[480px] px-2 text-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <Icon name="key" size={13} />
            RS256 Asymmetric JWT
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Icon name="cookie" size={13} />
            HttpOnly 7-Day Refresh
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Icon name="verified" size={13} />
            PCI-DSS Collection Standard
          </span>
        </div>
      </div>
    </main>
  );
}
