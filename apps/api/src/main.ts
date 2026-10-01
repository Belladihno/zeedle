import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Readable } from 'node:stream';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor.js';
import { SanitizationPipe } from './common/pipes/sanitization.pipe.js';
import { AppModule } from './app.module.js';
import { validateEnv } from './core/config/env.validation.js';

async function bootstrap(): Promise<void> {
  // Fail fast on misconfiguration — before anything else boots.
  const env = validateEnv();
  
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));

  await app.register(cookie);

  // Captures the raw body for the Paystack webhook HMAC check without
  // replacing Fastify's JSON parser.
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('preParsing', async (request, _reply, payload) => {
    if (!request.url.startsWith('/payments/webhook')) {
      return payload;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of payload as unknown as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    (request as unknown as { rawBody?: string }).rawBody = raw;
    // Re-emit as Buffer: Fastify's JSON parser Buffer.concats its input.
    return Readable.from([Buffer.from(raw, 'utf8')]);
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
  });
  await app.register(cors, {
    origin: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    new SanitizationPipe(),
  );

  // Last resort: request-scoped errors go through GlobalExceptionFilter, but a
  // throw outside that path would otherwise kill the process silently. Log it,
  // let in-flight work settle, then exit so the process manager restarts clean
  // instead of running on in an unknown state.
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception — shutting down', error);
    setTimeout(() => process.exit(1), 5000).unref();
    app.close().then(
      () => process.exit(1),
      () => process.exit(1),
    );
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection', reason);
  });

  app.enableShutdownHooks();
  await app.listen(env.PORT, '0.0.0.0');
}
await bootstrap();
