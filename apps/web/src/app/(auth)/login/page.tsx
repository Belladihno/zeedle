'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { LoginSchema, type LoginInput, type UserDto } from '@zeedle/shared-types';
import { Icon } from '@/components/brand';
import { AuthHeader } from '@/components/headers';
import { apiPost, problemDetail } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError('');
    try {
      const data = await apiPost<{ user: UserDto; accessToken: string }>('auth/login', values);
      setAuth(data.user, data.accessToken);
      router.replace('/dashboard');
    } catch (error) {
      const status = (error as { response?: { status: number; headers: Headers } })?.response?.status;
      if (status === 429) {
        const seconds = Number(
          (error as { response: { headers: Headers } }).response.headers.get('Retry-After') ?? 60,
        );
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
        setServerError('Too many attempts. Please wait before retrying.');
        return;
      }
      setServerError(await problemDetail(error));
    }
  }

  const waiting = retryAfter > 0;

  return (
    <>
      <AuthHeader />
      <main className="app-column flex min-h-screen flex-col bg-surface pb-8 pt-14">
        <div className="flex w-full flex-col gap-4 px-4 py-3">
          <div className="relative w-full">
            <div className="pointer-events-none absolute -top-10 left-1/2 h-20 w-48 -translate-x-1/2 rounded-full bg-brand/10 blur-2xl" />
            <div className="relative flex flex-col items-center pt-2 text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-elevated text-brand shadow-md">
                <Icon name="account_balance_wallet" size={26} />
              </div>
              <h1 className="text-lg font-semibold tracking-tight">Welcome back</h1>
              <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
                Sign in to access your digital wallet and instant transfers
              </p>
            </div>
          </div>

          {waiting ? (
            <div className="relative w-full overflow-hidden rounded-xl bg-elevated p-4 shadow-md" role="alert">
              <div className="absolute left-0 right-0 top-0 h-1 bg-pending/80" />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pending/10">
                  <span className="material-symbols-outlined animate-pulse text-[20px] text-pending">
                    hourglass_bottom
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[15px] font-semibold text-pending">
                      Too Many Requests (HTTP 429)
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-pending/10 px-2 py-0.5">
                      <span className="h-1.5 w-1.5 animate-ping rounded-full bg-pending" />
                      <span className="tabular text-[11px] font-semibold text-pending">
                        Retry in {retryAfter}s
                      </span>
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                    Rate limit exceeded: auth tier allows 5 requests/min per IP. Please back off
                    before retrying.
                  </p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-hover">
                    <div
                      className="h-full rounded-full bg-pending transition-all duration-1000 ease-linear"
                      style={{ width: `${Math.min(100, (retryAfter / 60) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="w-full space-y-4 rounded-xl bg-elevated p-4 shadow-md">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-medium text-text-secondary">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3.5 text-text-secondary">
                    <Icon name="alternate_email" size={18} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                    placeholder="name@example.com"
                    className="field !bg-[#0e0e13] !pl-10"
                    {...register('email')}
                  />
                </div>
                <p className="flex items-center gap-1 text-[11px] text-text-muted">
                  <Icon name="info" size={13} />
                  {errors.email ? <span className="text-debit">{errors.email.message}</span> : 'Valid lowercase email address'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-text-secondary">
                  Password
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3.5 text-text-secondary">
                    <Icon name="lock" size={18} />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    className="field !bg-[#0e0e13] !pl-10 !pr-11 tracking-wider"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2.5 flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:text-text-primary"
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 pt-1 text-text-secondary">
                  <Icon name="support_agent" size={14} />
                  <span className="text-[11px] text-text-muted">
                    Need credential assistance? Contact{' '}
                    <a className="text-brand hover:underline" href="mailto:support@zeedle.com">
                      support@zeedle.com
                    </a>
                  </span>
                </div>
                {errors.password ? <p className="text-xs text-debit">{errors.password.message}</p> : null}
              </div>

              {serverError && !waiting ? (
                <p role="alert" className="text-sm text-debit">
                  {serverError}
                </p>
              ) : null}

              <div className="pt-1">
                <button type="submit" disabled={isSubmitting || waiting} className="btn-primary disabled:cursor-not-allowed">
                  {waiting ? (
                    <span className="flex items-center gap-2">
                      <Icon name="timer" size={18} />
                      <span className="tabular">Sign In (Wait {retryAfter}s)</span>
                    </span>
                  ) : isSubmitting ? (
                    'Signing in…'
                  ) : (
                    'Sign In to Zeedle'
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-3 pb-4 pt-1 text-center">
            <p className="text-sm text-text-secondary">
              Don&apos;t have a Zeedle account?{' '}
              <Link href="/register" className="font-semibold text-brand hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
