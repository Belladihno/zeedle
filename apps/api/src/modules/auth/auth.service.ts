import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { normalizeKey } from '../../common/guards/jwt-auth.guard.js';
import { compareSecret, hashSecret } from '../../infrastructure/encryption/bcrypt.helper.js';
import type { User } from '../users/entities/user.entity.js';
import { AuthRepository } from './auth.repository.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

const REFRESH_DAYS = 7;

const EXPIRY_UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

function expiryToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid token expiry: ${value}`);
  }
  return Number(match[1]) * EXPIRY_UNIT_SECONDS[match[2]];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly auth: AuthRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: User } & TokenPair> {
    if (await this.auth.findUserByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists');
    }
    const { user } = await this.auth.createUserAndWallet({
      ...dto,
      passwordHash: await hashSecret(dto.password),
    });
    const pair = await this.issueTokenPair(user);
    return { user, ...pair };
  }

  async login(dto: LoginDto): Promise<{ user: User } & TokenPair> {
    const user = await this.auth.findUserByEmail(dto.email);
    const valid =
      user && user.isActive && !user.isDeleted && (await compareSecret(dto.password, user.passwordHash));
    if (!valid || !user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const pair = await this.issueTokenPair(user);
    return { user, ...pair };
  }
  
  async refresh(rawToken: string): Promise<TokenPair> {
    const [id, secret] = rawToken.split('.');
    const stored = id ? await this.auth.findRefreshTokenById(id) : null;
    const usable =
      stored &&
      !stored.isRevoked &&
      stored.expiresAt > new Date() &&
      secret &&
      (await compareSecret(secret, stored.tokenHash));
    if (!usable || !stored) {
      throw new UnauthorizedException('Not authenticated');
    }
    const user = await this.auth.findUserById(stored.userId);
    if (!user || !user.isActive || user.isDeleted) {
      throw new UnauthorizedException('Not authenticated');
    }
    await this.auth.revokeRefreshToken(stored.id);
    return this.issueTokenPair(user);
  }

  async logout(rawToken: string | undefined): Promise<void> {
    const [id] = (rawToken ?? '').split('.');
    if (id) {
      await this.auth.revokeRefreshToken(id);
    }
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        privateKey: normalizeKey(this.config.getOrThrow<string>('JWT_PRIVATE_KEY')),
        algorithm: 'RS256',
        expiresIn: expiryToSeconds(this.config.get<string>('JWT_ACCESS_EXPIRY', '15m')),
      },
    );
    const secret = randomBytes(32).toString('hex');
    const stored = await this.auth.storeRefreshToken(
      user.id,
      await hashSecret(secret),
      new Date(Date.now() + REFRESH_DAYS * 24 * 3600 * 1000),
    );
    return { accessToken, refreshToken: `${stored.id}.${secret}` };
  }
}
