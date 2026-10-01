import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { STATUS_CODES } from 'node:http';

interface RequestLike {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  status?: (code: number) => { send: (body: unknown) => unknown };
  statusCode?: number;
  setHeader?: (name: string, value: string) => void;
  end?: (body: string) => void;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestLike>();
    const res = ctx.getResponse<ResponseLike>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const header = req.headers['x-request-id'];
    const requestId = Array.isArray(header) ? header[0] : (header ?? 'unknown');

    const rawMessage =
      exception instanceof Error ? exception.message : 'Unknown error';
    // Client errors guide the caller — include what failed. Server errors stay generic.
    let detail: unknown = 'Internal server error';
    if (status < 500) {
      const response =
        exception instanceof HttpException ? exception.getResponse() : null;
      if (typeof response === 'string') {
        detail = response;
      } else if (response && typeof response === 'object' && 'message' in response) {
        detail = (response as { message: unknown }).message;
      } else {
        detail = rawMessage;
      }
    }

    this.logger.error(
      `requestId=${requestId} method=${req.method} url=${req.url} status=${status} error=${rawMessage}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const problem = {
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Error',
      status,
      detail,
      instance: `${req.method} ${req.url}`,
    };
    // Controller errors surface the Fastify reply; middleware errors surface
    // the raw response. Speak whichever one we were handed.
    if (typeof res.status === 'function') {
      res.status(status).send(problem);
    } else if (res.end) {
      res.statusCode = status;
      res.setHeader?.('content-type', 'application/json');
      res.end(JSON.stringify(problem));
    } else {
      throw exception;
    }
  }
}
