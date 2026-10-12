'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { UserDto } from '@zeedle/shared-types';
import { BottomNav } from '@/components/bottom-nav';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Restores the session on reload: memory is empty but the HttpOnly refresh
 * cookie may still hold a session. The profile fetch transparently refreshes
 * the access token first. Until the profile resolves, children see a neutral
 * skeleton — never a half-personalized screen. Dead sessions bounce to /login.
 */
export default function ConsumerLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [ready, setReady] = useState(() => user !== null);

  useEffect(() => {
    if (useAuthStore.getState().user) {
      setReady(true);
      return;
    }
    let cancelled = false;
    apiGet<UserDto>('users/me')
      .then((me) => {
        if (cancelled) return;
        useAuthStore.setState({ user: me });
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        useAuthStore.getState().clearAuth();
        router.replace('/login');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="app-column flex min-h-screen flex-col gap-4 bg-base px-4 pb-[76px] pt-20" aria-busy="true" aria-label="Loading wallet">
        <div className="h-6 w-40 animate-pulse rounded bg-elevated" />
        <div className="h-44 animate-pulse rounded-2xl bg-elevated" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 animate-pulse rounded-xl bg-elevated" />
          <div className="h-24 animate-pulse rounded-xl bg-elevated" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app-column min-h-screen bg-base pb-[76px]">
      {children}
      <BottomNav />
    </div>
  );
}
