import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';

// Fields that must never reach a log line (NDPA: no PII in logs).
const REDACTED_PATHS = [
  'password',
  'pin',
  'pinHash',
  'passwordHash',
  'email',
  'phone',
  'req.body.password',
  'req.body.pin',
  'req.body.pinHash',
  'req.body.passwordHash',
  'req.body.email',
  'req.body.phone',
  'req.headers.authorization',
];

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            ...(isProduction
              ? {}
              : { transport: { target: 'pino-pretty', options: { singleLine: true } } }),
            redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' },
            genReqId: (req) =>
              (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
            autoLogging: true,
          },
        };
      },
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
