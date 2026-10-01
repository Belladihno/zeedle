import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { REFRESH_COOKIE, refreshCookieOptions } from '../../common/utils/cookie.util.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setRefreshCookie(res: FastifyReply, token: string): void {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    res.setCookie(REFRESH_COOKIE, token, refreshCookieOptions(isProduction));
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ user: unknown; accessToken: string }> {
    const { user, accessToken, refreshToken } = await this.auth.register(dto);
    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ user: unknown; accessToken: string }> {
    const { user, accessToken, refreshToken } = await this.auth.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ accessToken: string }> {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) {
      throw new UnauthorizedException('Not authenticated');
    }
    const pair = await this.auth.refresh(raw);
    this.setRefreshCookie(res, pair.refreshToken);
    return { accessToken: pair.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ message: string }> {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { message: 'Logged out' };
  }
}
