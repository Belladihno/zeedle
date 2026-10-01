import type { ValueTransformer } from 'typeorm';

/**
 * node-pg returns BIGINT (int8) as string. Every kobo column uses this
 * transformer so the domain always works with plain numbers.
 */
export const koboTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null) => {
    if (value === null || value === undefined) return value;
    return typeof value === 'string' ? Number.parseInt(value, 10) : value;
  },
};
