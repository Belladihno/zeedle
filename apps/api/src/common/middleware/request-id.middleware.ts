import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  setHeader: (name: string, value: string) => void;
}

/** Attaches an x-request-id to every request for end-to-end tracing. */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestLike, res: ResponseLike, next: () => void): void {
    const existing = req.headers['x-request-id'];
    const requestId = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
