import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { AUTH_COOKIE } from './lib/auth';

const intl = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Account + admin need a session. Role checks happen in Laravel on every API call;
  // this only saves an unauthenticated visitor a page of errors.
  const guarded = /^\/(ar|en)\/(admin|account)(\/|$)/.test(pathname);
  if (guarded && !request.cookies.get(AUTH_COOKIE)) {
    const locale = pathname.split('/')[1] || routing.defaultLocale;
    const login = new URL(`/${locale}/login`, request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return intl(request);
}

export const config = {
  // Everything except API routes, Next internals, sitemap/robots and files with an extension.
  matcher: ['/((?!api|_next|_vercel|sitemap.xml|robots.txt|.*\\..*).*)'],
};
