import { describe, expect, it } from 'vitest';
import {
  buildAccountNumber,
  computeCheckDigit,
  generateAccountNumberCandidate,
  isValidAccountNumber,
} from '@zeedle/shared-types';

describe('account numbers', () => {
  it('builds a known vector: serial 123456789 carries check digit 5', () => {
    expect(computeCheckDigit('123456789')).toBe('5');
    expect(buildAccountNumber('123456789')).toBe('1234567895');
    expect(isValidAccountNumber('1234567895')).toBe(true);
  });

  it('generates candidates that always validate', () => {
    for (let i = 0; i < 50; i += 1) {
      const candidate = generateAccountNumberCandidate();
      expect(candidate).toMatch(/^\d{10}$/);
      expect(isValidAccountNumber(candidate)).toBe(true);
    }
  });

  it('rejects typos: wrong digit, swapped digits, bad length', () => {
    expect(isValidAccountNumber('1234567894')).toBe(false);
    expect(isValidAccountNumber('1234567985')).toBe(false);
    expect(isValidAccountNumber('123456789')).toBe(false);
    expect(isValidAccountNumber('12345678955')).toBe(false);
    expect(isValidAccountNumber('abcdefghij')).toBe(false);
    expect(isValidAccountNumber(undefined)).toBe(false);
  });
});
