import { CookieSerializeOptions } from '@fastify/cookie';

export const REFRESH_COOKIE = 'refreshToken';
const SEVEN_DAYS_SECONDS = 7 * 24 * 3600;

export function refreshCookieOptions(isProduction: boolean): CookieSerializeOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SEVEN_DAYS_SECONDS,
  };
}
