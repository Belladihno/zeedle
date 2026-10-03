import type { ReactNode } from 'react';
import { BottomNav } from '@/components/bottom-nav';

export default function ConsumerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[480px] bg-base pb-[76px]">
      {children}
      <BottomNav />
    </div>
  );
}
