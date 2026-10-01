import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { RolesGuard } from './roles.guard.js';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
  exports: [JwtAuthGuard, RolesGuard, JwtModule],
})
export class GuardsModule {}
