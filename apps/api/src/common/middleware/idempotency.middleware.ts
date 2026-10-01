import {
  BadRequestException,
  Inject,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import type { ServerResponse } from 'node:http';
import { REDIS_SERVICE, type IRedisService } from '../../core/redis/redis.interface.js';

export const IDEMPOTENCY_KEY_PREFIX = 'idem:';
export const IDEMPOTENCY_TTL_SECONDS = 24 * 3600;

interface RequestLike {
  method: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Retried POSTs return the stored response instead of re-executing.
 * Services store their result under `idem:{key}` (24h TTL) after success;
 * this middleware serves it back and rejects keyless requests outright.
 */
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  constructor(@Inject(REDIS_SERVICE) private readonly redis: IRedisService) {}

  async use(req: RequestLike, res: ServerResponse, next: () => void): Promise<void> {
    const header = req.headers['x-idempotency-key'];
    const key = Array.isArray(header) ? header[0] : header;
    if (!key) {
      throw new BadRequestException('x-idempotency-key header is required');
    }
    const cached = await this.redis.get(`${IDEMPOTENCY_KEY_PREFIX}${key}`);
    if (cached) {
      const requestId = req.headers['x-request-id'];
      const body = {
        success: true,
        data: JSON.parse(cached) as unknown,
        meta: { requestId, timestamp: new Date().toISOString() },
      };
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(body));
      return;
    }
    next();
  }
}
