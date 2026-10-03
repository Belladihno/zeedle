import { HttpException, HttpStatus, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis as UpstashRedis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import type { JwtPayload } from '../decorators/current-user.decorator.js';

const WINDOW_MS = 60_000;
const TIERS = {
  auth: 5,
  payments: 10,
  // Recipient lookup is enumeration-sensitive: strict enough to stop
  // scripted harvesting, loose enough for genuine typo retries.
  resolve: 20,
  general: 100,
} as const;

type Tier = keyof typeof TIERS;

interface LocalBucket {
  count: number;
  resetAt: number;
}

interface RequestLike {
  url: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  user?: JwtPayload;
}

interface ResponseLike {
  header: (name: string, value: string | number) => unknown;
}

/**
 * Sliding-window rate limits per IP + user, tiered by route.
 * Upstash in production, an in-memory map in development.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly upstash: Record<Tier, Ratelimit> | null;
  private readonly buckets = new Map<string, LocalBucket>();

  constructor(config: ConfigService) {
    if (config.get<string>('NODE_ENV') === 'production') {
      const redis = new UpstashRedis({
        url: config.getOrThrow<string>('UPSTASH_REDIS_REST_URL'),
        token: config.getOrThrow<string>('UPSTASH_REDIS_REST_TOKEN'),
      });
      const window = '60 s';
      const limiter = (limit: number): Ratelimit =>
        new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window) });
      this.upstash = {
        auth: limiter(TIERS.auth),
        payments: limiter(TIERS.payments),
        resolve: limiter(TIERS.resolve),
        general: limiter(TIERS.general),
      };
    } else {
      this.upstash = null;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<RequestLike>();
    const res = ctx.getResponse<ResponseLike>();
    const path = req.url.split('?')[0];
    const tier: Tier = path.startsWith('/auth/')
      ? 'auth'
      : path.startsWith('/payments/')
        ? 'payments'
        : path.includes('/resolve')
          ? 'resolve'
          : 'general';
    const identity = `${req.ip ?? 'unknown'}:${req.user?.sub ?? 'anon'}`;
    const key = `ratelimit:${tier}:${identity}`;

    if (this.upstash) {
      const { success, reset } = await this.upstash[tier].limit(key);
      if (!success) {
        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        res.header('Retry-After', retryAfter);
        throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
      }
      return true;
    }
    const { allowed, retryAfter } = this.checkLocal(key, TIERS[tier]);
    if (!allowed) {
      res.header('Retry-After', retryAfter);
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }

  private checkLocal(key: string, limit: number): { allowed: boolean; retryAfter: number } {
    const now = Date.now();
    if (this.buckets.size > 10000) {
      for (const [k, bucket] of this.buckets) {
        if (bucket.resetAt <= now) this.buckets.delete(k);
      }
    }
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return { allowed: true, retryAfter: 0 };
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
    }
    return { allowed: true, retryAfter: 0 };
  }
}
