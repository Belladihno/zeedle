import { z } from 'zod';

/**
 * Zeedle account numbers: 10 digits, NUBAN-inspired.
 *
 * First 9 digits are a random serial, the 10th is a check digit so typos
 * (wrong or swapped digits) are rejected before touching the database.
 * Stored as text (CHAR(10)) so leading zeros survive. These are
 * Zeedle-internal and NOT real NUBAN numbers — no bank-code registry.
 */

export const ACCOUNT_NUMBER_LENGTH = 10;
export const ACCOUNT_NUMBER_PATTERN = /^\d{10}$/;

/** NUBAN-style weights applied to the 9-digit serial. */
const CHECK_WEIGHTS = [3, 7, 3, 3, 7, 3, 3, 7, 3] as const;

/** Computes the check digit for a 9-digit serial. */
export function computeCheckDigit(serial9: string): string {
  if (!/^\d{9}$/.test(serial9)) {
    throw new Error('Serial must be exactly 9 digits');
  }
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(serial9[i]) * CHECK_WEIGHTS[i];
  }
  return String((10 - (sum % 10)) % 10);
}

/** Builds a full 10-digit account number from a 9-digit serial. */
export function buildAccountNumber(serial9: string): string {
  return `${serial9}${computeCheckDigit(serial9)}`;
}

/** True when the value is 10 digits with a valid check digit. */
export function isValidAccountNumber(value: unknown): value is string {
  if (typeof value !== 'string' || !ACCOUNT_NUMBER_PATTERN.test(value)) {
    return false;
  }
  try {
    return value[9] === computeCheckDigit(value.slice(0, 9));
  } catch {
    return false;
  }
}

/**
 * Random candidate with a valid check digit. Uniqueness is enforced by the
 * database UNIQUE constraint — callers must retry on collision.
 * Uses WebCrypto so it runs in Node and browsers alike.
 */
export function generateAccountNumberCandidate(): string {
  const bytes = new Uint8Array(9);
  globalThis.crypto.getRandomValues(bytes);
  const serial = Array.from(bytes, (b) => String(b % 10)).join('');
  return buildAccountNumber(serial);
}

export const AccountNumberSchema = z
  .string()
  .regex(ACCOUNT_NUMBER_PATTERN, 'Account number must be 10 digits')
  .refine(isValidAccountNumber, 'Invalid Zeedle account number');
