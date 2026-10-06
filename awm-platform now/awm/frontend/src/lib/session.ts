import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { AUTH_COOKIE } from './auth';

const BASE = (process.env.API_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1').replace(/\/$/, '');

export interface Me {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  locale: 'ar' | 'en';
  roles: string[];
  permissions: string[];
}

export const getToken = async () => (await cookies()).get(AUTH_COOKIE)?.value ?? null;

/** Current user, fetched once per request. null = guest or expired token. */
export const getMe = cache(async (): Promise<Me | null> => {
  const token = await getToken();
  if (!token) return null;
  const res = await fetch(`${BASE}/auth/me`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, cache: 'no-store' });
  return res.ok ? ((await res.json()) as Me) : null;
});

export const can = (me: Me | null, permission: string) => !!me?.permissions.includes(permission);

/**
 * Authenticated GET for admin/account Server Components. Never cached.
 * 401 sends the user to login; 403 and 404 return null so the page can show a message.
 */
export async function authedGet<T>(path: string, locale: string, loginNext?: string): Promise<T | null> {
  const token = await getToken();
  if (!token) redirect(`/${locale}/login${loginNext ? `?next=${encodeURIComponent(loginNext)}` : ''}`);

  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'X-Locale': locale },
    cache: 'no-store',
  });
  if (res.status === 401) redirect(`/${locale}/login${loginNext ? `?next=${encodeURIComponent(loginNext)}` : ''}`);
  if (res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} on GET ${path}`);

  return (await res.json()) as T;
}
