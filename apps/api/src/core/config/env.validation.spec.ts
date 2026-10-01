import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateEnv } from './env.validation.js';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3000',
  DATABASE_URL: 'postgresql://zeedle:password@localhost:5432/zeedle',
  JWT_PRIVATE_KEY: 'a'.repeat(40),
  JWT_PUBLIC_KEY: 'b'.repeat(40),
  PAYSTACK_SECRET: 'sk_test_abc123',
  PAYSTACK_WEBHOOK_SECRET: 'whsec_test_abc123',
};

function mockExit() {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`exit:${code ?? 0}`);
  }) as never);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('validateEnv', () => {
  it('accepts a valid development env with defaults applied', () => {
    const env = validateEnv({ ...validEnv });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.REDIS_HOST).toBe('localhost');
    expect(env.REDIS_PORT).toBe(6379);
  });

  it('logs violations and exits when required vars are missing', () => {
    mockExit();
    expect(() => validateEnv({})).toThrow('exit:1');
    expect(console.error).toHaveBeenCalled();
  });

  it('rejects a Paystack secret without the sk_ prefix', () => {
    mockExit();
    expect(() => validateEnv({ ...validEnv, PAYSTACK_SECRET: 'pk_test_abc' })).toThrow('exit:1');
  });

  it('requires Upstash credentials in production', () => {
    mockExit();
    expect(() => validateEnv({ ...validEnv, NODE_ENV: 'production' })).toThrow('exit:1');
  });

  it('accepts production env when Upstash credentials are present', () => {
    const env = validateEnv({
      ...validEnv,
      NODE_ENV: 'production',
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token123',
    });
    expect(env.NODE_ENV).toBe('production');
  });
});
