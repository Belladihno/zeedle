import { Icon, Logo } from '@/components/brand';

/** Fixed top bar for authenticated screens: logo, NGN badge, alerts, avatar. */
export function AppHeader({ hasUnread = false }: { hasUnread?: boolean }) {
  return (
    <header className="fixed top-0 z-50 w-full bg-surface/85 shadow-[0_1px_8px_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[480px] items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="ml-1 hidden text-xl font-semibold tracking-tight sm:inline">Zeedle</span>
          <span className="ml-2 flex items-center gap-1.5 rounded-full bg-credit/10 px-2 py-0.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-credit" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-credit">NGN</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-text-secondary hover:text-text-primary"
          >
            <Icon name="notifications" size={22} />
            {hasUnread ? (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-debit ring-2 ring-surface" />
            ) : null}
          </button>
          <span className="flex h-11 w-11 items-center justify-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand ring-1 ring-border-strong/40">
              •
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}

/** Fixed top bar for auth screens: back, logo, exit. */
export function AuthHeader({ onBack }: { onBack?: () => void }) {
  return (
    <header className="fixed top-0 z-50 w-full bg-surface/85 shadow-[0_1px_8px_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Go back"
            onClick={onBack ?? (() => window.history.back())}
            className="flex h-11 w-11 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-hover"
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <Logo height={26} />
        </div>
        <span className="flex min-h-[44px] items-center px-3 text-xs font-medium text-text-secondary">
          Exit
        </span>
      </div>
    </header>
  );
}
