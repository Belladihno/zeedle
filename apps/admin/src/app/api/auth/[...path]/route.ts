import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Same-origin bridge for cookie-bearing auth calls (login/refresh/logout).
 * The browser only ever sees this app's domain, so the session cookie is
 * first-party and never subject to third-party blocking. The refresh token
 * is re-set here with identical lifetime semantics; the body passes through.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const outgoing: Record<string, string> = { 'Content-Type': 'application/json' };
  const session = request.cookies.get('refreshToken')?.value;
  if (session) {
    outgoing.Cookie = `refreshToken=${session}`;
  }
  const upstream = await fetch(`${API_URL}/auth/${path.join('/')}`, {
    method: 'POST',
    headers: outgoing,
    body: await request.text(),
  });
  const data = (await upstream.json().catch(() => ({}))) as unknown;
  const response = NextResponse.json(data, { status: upstream.status });
  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) {
    const match = /refreshToken=([^;]*)/.exec(setCookie);
    if (match?.[1]) {
      response.cookies.set('refreshToken', match[1], {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 604800,
      });
    } else {
      response.cookies.delete('refreshToken');
    }
  }
  return response;
}
