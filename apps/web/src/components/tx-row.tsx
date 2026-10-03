import type { TransactionDto } from '@zeedle/shared-types';

export function TxRow({ tx }: { tx: TransactionDto }) {
  const inflow = tx.type === 'CREDIT';
  return (
    <div className="flex min-h-[56px] items-center gap-3 px-3 py-2">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          inflow ? 'bg-credit/10 text-credit' : 'bg-debit/10 text-debit'
        }`}
      >
        {inflow ? '↓' : '↑'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tx.narration ?? (inflow ? 'Wallet credit' : 'Transfer')}</p>
        <p className="text-[11px] text-text-muted">
          {new Date(tx.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>
      <div className="text-right">
        <p className={`tabular text-sm font-semibold ${inflow ? 'text-credit' : ''}`}>
          {inflow ? '+' : '-'}₦{(tx.amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </p>
        <span className={`badge ${tx.status === 'SUCCESS' ? 'badge-success' : tx.status === 'PENDING' ? 'badge-pending' : 'badge-failed'}`}>
          {tx.status === 'SUCCESS' ? 'Success' : tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}
        </span>
      </div>
    </div>
  );
}
