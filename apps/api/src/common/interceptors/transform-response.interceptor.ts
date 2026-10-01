import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Wraps every success response in a standard envelope. */
@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const header = req.headers['x-request-id'];
    const requestId = Array.isArray(header) ? header[0] : (header ?? 'unknown');
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: { requestId, timestamp: new Date().toISOString() },
      })),
    );
  }
}
