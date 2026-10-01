import type { ValueTransformer } from 'typeorm';

/**
 * node-pg returns BIGINT columns as strings. Convert them back to numbers
 * so balances and amounts are always plain numbers in domain code.
 * All kobo columns are NOT NULL, so there is nothing else to handle.
 */
export const koboTransformer: ValueTransformer = {
  to: (value: number): number => value,
  from: (value: string | number): number =>
    typeof value === 'string' ? parseInt(value, 10) : value,
};
