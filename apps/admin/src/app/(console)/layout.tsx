'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon, Logo, initialsOf } from '@/components/brand';
import { useAuthStore } from '@/stores/auth-store';

const ITEMS = [
  { href: '/overview', label: 'Overview', icon: 'dashboard' },
  { href: '/settlements', label: 'Settlements', icon: 'account_balance', badge: 'Live Engine' },
  { href: '/transactions', label: 'Transactions', icon: 'receipt_long' },
  { href: '/users', label: 'Users', icon: 'group' },
];

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  function signOut() {
    clearAuth();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen bg-base text-text-primary">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <Logo height={24} />
          <div className="flex flex-col">
            <span className="rounded bg-brand px-1.5 py-px text-[10px] font-bold tracking-wider text-white">
              ADMIN CONSOLE
            </span>
            <span className="mt-0.5 text-[11px] text-text-muted">v1.0.0 • PROD</span>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-2 py-3">
          {ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                  active
                    ? 'bg-elevated font-semibold text-text-primary shadow-[inset_2px_0_0_0_#5b6ef5]'
                    : 'font-medium text-text-secondary hover:bg-elevated hover:text-text-primary'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </span>
                {item.badge ? (
                  <span className="rounded-full bg-credit/20 px-2 py-px text-[11px] text-credit">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border p-3">
          <div className="flex items-center gap-2 rounded-lg bg-elevated p-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">
              {user ? initialsOf(`${user.firstName} ${user.lastName}`) : '••'}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium">
                {user ? `${user.firstName} ${user.lastName}` : 'Operator'}
              </span>
              <span className="truncate text-[11px] text-text-muted">{user?.email ?? ''}</span>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="ml-auto p-1.5 text-text-muted transition-colors hover:text-text-primary"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-6 py-6 lg:px-8">{children}</main>
    </div>
  );
}
