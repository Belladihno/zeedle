import type { ReactNode } from 'react';
import { BottomNav } from '@/components/bottom-nav';

export default function ConsumerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-column min-h-screen bg-base pb-[76px]">
      {children}
      <BottomNav />
    </div>
  );
}
