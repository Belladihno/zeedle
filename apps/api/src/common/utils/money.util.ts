/** Naira to kobo: the only conversion point. Money moves in kobo everywhere else. */
export function nairaToKobo(naira: number): number {
  return naira * 100;
}

/** Display-only formatting. Never compute with the result. */
export function formatNaira(balanceKobo: number): string {
  const naira = balanceKobo / 100;
  const grouped = naira.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₦${grouped}`;
}
