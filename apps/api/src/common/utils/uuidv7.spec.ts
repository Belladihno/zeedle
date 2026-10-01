import { describe, expect, it } from 'vitest';
import { uuidv7 } from './uuidv7.js';

describe('uuidv7', () => {
  it('produces version 7, variant 10xxxxxx UUIDs', () => {
    const id = uuidv7();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('is time-ordered by millisecond', () => {
    const first = uuidv7(new Date('2026-01-01T00:00:00.000Z'));
    const second = uuidv7(new Date('2026-06-01T00:00:00.000Z'));
    expect(first < second).toBe(true);
  });

  it('produces unique values', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv7()));
    expect(ids.size).toBe(1000);
  });
});
