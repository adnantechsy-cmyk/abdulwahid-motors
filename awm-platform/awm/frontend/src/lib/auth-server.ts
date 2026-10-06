import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { API_BASE } from '@/lib/api/server';
import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE, type AuthUser } from '@/lib/auth';
import { rejectCrossOrigin } from '@/lib/same-origin';

const cookieOptions = {
  httpOnly: true, // never readable from JS
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: AUTH_COOKIE_MAX_AGE,
};

const localeOf = (request: NextRequest) => (request.headers.get('x-locale') === 'en' ? 'en' : 'ar');

/**
 * Forwards a login/register body to Laravel (only the listed fields), stores the returned token in the
 * httpOnly cookie, and gives the browser the user but never the token. Validation errors pass through.
 */
export async function authenticate(request: NextRequest, path: '/auth/login' | '/auth/register' | '/auth/google' | '/auth/2fa/verify', fields: string[]) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!input) return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });

  const body = Object.fromEntries(fields.filter((k) => input[k] !== undefined && input[k] !== '').map((k) => [k, input[k]]));
  const locale = localeOf(request);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Locale': locale },
      body: JSON.stringify({ ...body, locale }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'Service unavailable.' }, { status: 503 });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ message: data.message, code: data.code, errors: data.errors }, { status: res.status });

  // Staff with an authenticator app: the password was right, but no session exists until the code is checked.
  if (res.status === 202 && data.two_factor) return NextResponse.json({ two_factor: true, challenge: data.challenge }, { status: 202 });

  const response = NextResponse.json({ user: data.user as AuthUser }, { status: res.status });
  response.cookies.set(AUTH_COOKIE, data.token, cookieOptions);
  return response;
}

/**
 * Forwards a public, session-less call (forgot / reset password) to Laravel, with only the listed fields.
 * Nothing about the account is revealed: Laravel answers the same way whether or not it exists.
 */
export async function relay(request: NextRequest, path: '/auth/forgot-password' | '/auth/reset-password', fields: string[]) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!input) return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });

  const body = Object.fromEntries(fields.filter((k) => input[k] !== undefined && input[k] !== '').map((k) => [k, input[k]]));

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Locale': localeOf(request) },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'Service unavailable.' }, { status: 503 });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(res.ok ? { status: data.status ?? 'ok' } : { message: data.message, code: data.code, errors: data.errors }, { status: res.status });
}

export async function currentUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return res.ok ? ((await res.json()) as AuthUser) : null;
  } catch {
    return null;
  }
}

export async function revokeToken(request: NextRequest): Promise<void> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return;

  // Best effort: the cookie is cleared either way.
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => undefined);
}

export const clearedCookie = { name: AUTH_COOKIE, value: '', ...cookieOptions, maxAge: 0 };
