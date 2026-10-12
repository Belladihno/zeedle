import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/** The only upstream auth endpoints this bridge serves. Anything else 404s. */
const ALLOWED = new Set(['login', 'register', 'refresh', 'logout']);

/**
 * Same-origin bridge for cookie-bearing auth calls (login/register/refresh/logout).
 * The browser only ever sees this app's domain, so the session cookie is
 * first-party and never subject to third-party blocking. The refresh token
 * is re-set here with identical lifetime semantics; the body passes through.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const endpoint = path.join('/');
  if (path.length !== 1 || !ALLOWED.has(endpoint)) {
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Unknown auth endpoint',
        instance: `/api/auth/${endpoint}`,
      },
      { status: 404 },
    );
  }
  const outgoing: Record<string, string> = { 'Content-Type': 'application/json' };
  const session = request.cookies.get('refreshToken')?.value;
  if (session) {
    outgoing.Cookie = `refreshToken=${encodeURIComponent(session)}`;
  }
  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/auth/${endpoint}`, {
      method: 'POST',
      headers: outgoing,
      body: await request.text(),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Bad Gateway',
        status: 502,
        detail: 'Authentication service unavailable',
        instance: `/api/auth/${endpoint}`,
      },
      { status: 502 },
    );
  }
  const data = (await upstream.json().catch(() => ({}))) as unknown;
  const response = NextResponse.json(data, { status: upstream.status });
  // Cookies are only bridged on success: an error response must never plant
  // a session, and logout's expired cookie must clear the browser copy.
  if (upstream.ok) {
    const cookies =
      typeof upstream.headers.getSetCookie === 'function'
        ? upstream.headers.getSetCookie()
        : [upstream.headers.get('set-cookie') ?? ''];
    const refresh = cookies
      .map((c) => /refreshToken=([^;]*)/.exec(c)?.[1])
      .find((v) => v !== undefined);
    if (refresh) {
      response.cookies.set('refreshToken', refresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 604800,
      });
    } else if (endpoint === 'logout') {
      response.cookies.delete('refreshToken');
    }
  }
  return response;
}
