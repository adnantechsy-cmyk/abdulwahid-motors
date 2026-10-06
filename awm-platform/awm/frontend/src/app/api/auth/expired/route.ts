import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/auth';
import { clearedCookie } from '@/lib/auth-server';

/** Landing point when Laravel rejected the stored token: drop the cookie, then show the login form. */
export function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next');
  const locale = /^\/en(\/|$)/.test(next ?? '') ? 'en' : 'ar';

  const login = new URL(`/${locale}/login`, request.url);
  login.searchParams.set('next', safeNextPath(next, locale));

  const response = NextResponse.redirect(login);
  response.cookies.set(clearedCookie);
  return response;
}
