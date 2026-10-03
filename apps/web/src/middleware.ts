import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/transfer', '/fund', '/transactions', '/settings'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }
  // HttpOnly session cookie presence gates protected routes.
  // The API verifies it; an expired session 401s into the refresh flow.
  if (!request.cookies.has('refreshToken')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
