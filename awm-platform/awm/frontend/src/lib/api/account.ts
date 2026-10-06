import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE } from '@/lib/auth';
import { ApiHttpError, apiGet } from './server';

/**
 * Authenticated read for the account area. The token comes from the httpOnly cookie and is sent
 * server-to-server; responses are never cached. Returns null on 404 (page calls notFound()).
 *
 * An expired or revoked token (401) goes through /api/auth/expired, which clears the stale cookie
 * before showing the login form. Redirecting straight to /login would loop, because that page
 * skips the form whenever a cookie is present.
 */
export async function accountGet<T>(path: string, locale: string, area: 'account' | 'admin' = 'account'): Promise<T | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const home = `/${locale}/${area}`;
  if (!token) redirect(`/${locale}/login?next=${encodeURIComponent(home)}`);

  try {
    return await apiGet<T>(path, { locale, token });
  } catch (error) {
    if (error instanceof ApiHttpError && error.status === 401) redirect(`/api/auth/expired?next=${encodeURIComponent(home)}`);
    throw error;
  }
}

export async function accountUser(locale: string): Promise<{ id: number; name: string; phone: string | null; email: string | null } | null> {
  return accountGet('/auth/me', locale);
}
