'use client';

import { Icon } from '@/components/brand';

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-brand">
          <span>Ledger Core / Audit Engine</span>
          <span className="h-1 w-1 rounded-full bg-text-muted" />
          <span className="flex items-center gap-1 text-credit">
            <span className="h-1.5 w-1.5 rounded-full bg-credit" />
            Zero Discrepancy SLA
          </span>
        </div>
        <h1 className="text-[28px] font-bold tracking-tight">Platform Transactions Ledger</h1>
        <p className="max-w-3xl text-sm text-text-secondary">
          Global double-entry audit trail across all user wallets, bank corridors, and payment
          gateways with immutable UUID resolution.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-xl bg-elevated p-10 text-center shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-hover text-brand">
          <Icon name="receipt_long" size={24} />
        </span>
        <h2 className="text-[15px] font-semibold">Platform ledger view pending</h2>
        <p className="max-w-md text-sm text-text-secondary">
          The current history endpoint is per-wallet only. This screen unlocks with{' '}
          <code className="rounded bg-[#0e0e13] px-1 py-0.5 font-mono text-[12px] text-brand">
            GET /admin/transactions
          </code>{' '}
          (ADMIN-only, same filter DTO) — API gap §5.3 in ADMIN-FRONTEND.md.
        </p>
        <div className="flex items-center gap-2 text-[11px] text-text-muted">
          <Icon name="info" size={14} />
          <span>Per Stitch design: search + type/status/source/settlement filters, journal table, row inspection drawer.</span>
        </div>
      </div>
    </div>
  );
}
