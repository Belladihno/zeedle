import { z } from 'zod';

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_PRIVATE_KEY: z.string().min(32, 'JWT_PRIVATE_KEY is required'),
  JWT_PUBLIC_KEY: z.string().min(32, 'JWT_PUBLIC_KEY is required'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  PAYSTACK_SECRET: z.string().startsWith('sk_', 'PAYSTACK_SECRET must begin with sk_'),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(1, 'PAYSTACK_WEBHOOK_SECRET is required'),
  PAYSTACK_BASE_URL: z.string().default('https://api.paystack.co'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  OBSERVE_APP_KEY: z.string().optional(),
  OBSERVE_APP_SECRET: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof baseSchema>;

/**
 * Validates environment variables before anything else boots.
 * Logs every violation and exits — the app must never run misconfigured.
 */
export function validateEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = baseSchema.safeParse(source);
  if (!parsed.success) {
    console.error('Environment validation failed:');
    for (const issue of parsed.error.issues) {
      console.error(` - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  const env = parsed.data;
  if (
    env.NODE_ENV === 'production' &&
    (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    console.error('Environment validation failed:');
    console.error(
      ' - UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production',
    );
    process.exit(1);
  }
  return env;
}
