'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { RegisterSchema, type RegisterInput, type UserDto } from '@zeedle/shared-types';
import { Icon } from '@/components/brand';
import { AuthHeader } from '@/components/headers';
import { apiPost, problemDetail } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(RegisterSchema) });
  const firstName = useWatch({ control, name: 'firstName' });
  const lastName = useWatch({ control, name: 'lastName' });

  async function onSubmit(values: RegisterInput) {
    setServerError('');
    try {
      const data = await apiPost<{ user: UserDto; accessToken: string }>('auth/register', values);
      setAuth(data.user, data.accessToken);
      router.replace('/dashboard');
    } catch (error) {
      setServerError(await problemDetail(error));
    }
  }

  const handle = (firstName ?? '').trim().toLowerCase();

  return (
    <>
      <AuthHeader />
      <main className="app-column flex min-h-screen flex-col bg-surface pb-8 pt-14">
        <div className="flex w-full flex-col gap-5 px-4 pb-8">
          <div className="pb-4 pt-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[11px] text-text-secondary">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-credit" />
                Ledger Engine: Ready
              </span>
              <span className="text-[11px] font-medium tracking-wide text-brand">STEP 01 / 02</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-hover">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#7586ff] to-credit transition-all duration-500" />
            </div>
          </div>

          <section className="mb-1">
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-elevated px-2.5 py-1 text-brand shadow-sm">
              <Icon name="account_balance_wallet" size={15} filled />
              <span className="text-xs font-semibold">Tier-1 Sovereign Vault</span>
            </div>
            <h1 className="text-[28px] font-bold leading-[34px] tracking-tight">Create your account</h1>
            <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
              Instant zero-fee peer-to-peer wallet provisioned upon registration.
            </p>
          </section>

          <div className="relative mb-1 overflow-hidden rounded-xl bg-[#1b1b20] p-4 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-credit/10 blur-xl" />
            <div className="relative z-10 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-elevated text-credit shadow-sm">
                <Icon name="verified_user" size={22} filled />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold">Instant NGN Wallet Provisioning</span>
                  <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-semibold text-credit">
                    Live
                  </span>
                </div>
                <p className="text-[11px] leading-normal text-text-secondary">
                  A dedicated zero-balance NGN wallet with double-entry ledger is automatically
                  provisioned upon account creation.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="block text-xs font-medium">
                  First Name
                </label>
                <input id="firstName" autoComplete="given-name" placeholder="Amara" className="field" {...register('firstName')} />
                {errors.firstName ? <p className="text-xs text-debit">{errors.firstName.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lastName" className="block text-xs font-medium">
                  Last Name
                </label>
                <input id="lastName" autoComplete="family-name" placeholder="Okoye" className="field" {...register('lastName')} />
                {errors.lastName ? <p className="text-xs text-debit">{errors.lastName.message}</p> : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="email" className="block text-xs font-medium">
                  Email Address
                </label>
              </div>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-text-secondary">
                  <Icon name="mail" size={20} />
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="amara.okoye@example.com"
                  className="field !pl-11 lowercase"
                  {...register('email')}
                />
              </div>
              {errors.email ? <p className="text-xs text-debit">{errors.email.message}</p> : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-xs font-medium">
                Phone Number
              </label>
              <div className="flex items-stretch overflow-hidden rounded-md bg-[#1b1b20]">
                <div className="flex flex-shrink-0 select-none items-center gap-1.5 bg-elevated px-3">
                  <span className="text-base leading-none">🇳🇬</span>
                  <span className="text-sm font-semibold tracking-tight">+234</span>
                </div>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel-national"
                  placeholder="0803 000 0000"
                  className="tabular h-12 w-full bg-transparent px-4 text-sm focus:outline-none"
                  {...register('phone')}
                />
              </div>
              <p className="text-[11px] text-text-secondary">
                Used for 2FA one-time security authentication and peer lookup.
              </p>
              {errors.phone ? <p className="text-xs text-debit">{errors.phone.message}</p> : null}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-medium">
                  Create Password
                </label>
                <span className="text-[11px] text-[#bcc2ff]">Min 8 characters</span>
              </div>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-text-secondary">
                  <Icon name="lock" size={20} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••••••"
                  className="field !pl-11 !pr-11"
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 flex h-8 w-8 items-center justify-center rounded text-text-secondary transition-colors hover:text-text-primary"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-credit">
                  <Icon name="verified" size={16} />
                </span>
                <span className="text-[11px] text-text-secondary">
                  8–128 characters (no arbitrary strength regex enforced server-side)
                </span>
              </div>
              {errors.password ? <p className="text-xs text-debit">{errors.password.message}</p> : null}
            </div>

            {handle ? (
              <div className="flex items-center justify-between rounded-xl bg-[#1b1b20] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7586ff]/20 text-[15px] font-semibold text-[#bcc2ff]">
                    {(firstName?.[0] ?? '') + (lastName?.[0] ?? '')}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {firstName} {lastName}
                    </p>
                    <p className="font-mono text-[11px] text-text-secondary">
                      @{handle} • zeedle.me/{handle}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-elevated px-2.5 py-1 text-[11px] text-brand">
                  Allocated Handle
                </span>
              </div>
            ) : null}

            <div className="pt-1">
              <label className="flex cursor-pointer select-none items-start gap-3">
                <span className="relative flex items-center pt-0.5">
                  <input type="checkbox" required className="peer sr-only" />
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-elevated transition-all peer-checked:bg-[#7586ff]">
                    <Icon name="check" size={16} />
                  </span>
                </span>
                <span className="text-[11px] leading-relaxed text-text-secondary">
                  By creating an account, you agree to Zeedle&apos;s{' '}
                  <span className="font-medium text-brand">Terms of Service</span> and{' '}
                  <span className="font-medium text-brand">NDPA 2023 compliant Privacy Policy</span>.
                </span>
              </label>
            </div>

            {serverError ? (
              <p role="alert" className="text-sm text-debit">
                {serverError}
              </p>
            ) : null}

            <div className="pt-1">
              <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center justify-center gap-2">
                <span>{isSubmitting ? 'Provisioning Ledger…' : 'Create Account & Provision Wallet'}</span>
                <Icon name="arrow_forward" size={19} />
              </button>
            </div>
          </form>

          <footer className="mt-2 space-y-4 text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <Link href="/login" className="ml-1 font-semibold text-brand hover:underline">
                Sign in
              </Link>
            </p>
            <div className="flex items-center justify-center gap-2">
              <Icon name="verified_user" size={15} />
              <span className="text-[11px] text-text-secondary">
                PCI-DSS collection aligned • NDPA 2023 Compliant
              </span>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
