import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, ROLE_HINT_COOKIE } from '@/lib/auth';

const BASE = (process.env.API_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1').replace(/\/$/, '');

/** Exchanges credentials for a Sanctum token and keeps it in an httpOnly cookie (never readable by JS). */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Locale': request.headers.get('x-locale') ?? 'ar', 'User-Agent': request.headers.get('user-agent') ?? 'web' },
    body: JSON.stringify({ login: body.login, password: body.password }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const response = NextResponse.json({ user: data.user });
  response.cookies.set(AUTH_COOKIE, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.set(ROLE_HINT_COOKIE, data.user?.roles?.length ? 'staff' : 'customer', {
    httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
