'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/brand';

const ITEMS = [
  { href: '/dashboard', label: 'Home', icon: 'account_balance_wallet', match: ['/dashboard'] },
  { href: '/transfer', label: 'Send', icon: 'send', match: ['/transfer'] },
  { href: '/fund', label: 'Fund', icon: 'add_card', match: ['/fund'] },
  { href: '/transactions', label: 'Activity', icon: 'receipt_long', match: ['/transactions'] },
  { href: '/settings', label: 'Settings', icon: 'tune', match: ['/settings'] },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="app-fixed bottom-0 z-50 bg-surface/95 shadow-[0_-2px_12px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="flex h-[60px] items-center justify-around px-2">
        {ITEMS.map((item) => {
          const active = item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? 'text-brand [filter:drop-shadow(0_0_8px_rgba(91,110,245,0.4))]'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon name={item.icon} size={20} />
              <span className="text-[11px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
