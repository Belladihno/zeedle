import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '@zeedle/shared-types';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!req.user) return undefined;
    return field ? req.user[field] : req.user;
  },
);
