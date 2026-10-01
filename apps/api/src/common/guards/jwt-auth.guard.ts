import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '../decorators/current-user.decorator.js';

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  user?: JwtPayload;
}

/** Verifies the RS256 access token and attaches its payload as request.user. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestLike>();
    const header = req.headers.authorization;
    const token = Array.isArray(header) ? header[0] : header;
    if (!token?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Not authenticated');
    }
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token.slice(7), {
        publicKey: normalizeKey(this.config.getOrThrow<string>('JWT_PUBLIC_KEY')),
        algorithms: ['RS256'],
      });
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Not authenticated');
    }
  }
}

/** Render-style env vars store literal \n — restore real newlines for PEM parsing. */
export function normalizeKey(key: string): string {
  return key.includes('\n') ? key : key.replace(/\\n/g, '\n');
}
