import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/overview', '/settlements', '/transactions', '/users'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }
  // HttpOnly session cookie presence gates protected routes.
  // The API verifies it; role is asserted client-side after /users/me.
  if (!request.cookies.has('refreshToken')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
