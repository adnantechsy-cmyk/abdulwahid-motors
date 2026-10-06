import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { AuthUser } from '@/lib/auth';
import { ApiHttpError } from './server';
import { accountGet } from './account';

/** Authenticated read for the admin area (same cookie and expiry handling as the account area). */
export const adminGet = <T>(path: string, locale: string) => accountGet<T>(path, locale, 'admin');

/** The signed-in staff member, fetched once per request however many components ask. */
export const getAdminUser = cache(async (locale: string): Promise<AuthUser | null> => adminGet<AuthUser>('/auth/me', locale));

export const isStaff = (user: AuthUser | null): user is AuthUser => Boolean(user && user.roles.length > 0);

/** Permission names are Laravel's (spatie). Admins hold every one of them. */
export const can = (user: AuthUser, ...anyOf: string[]) => anyOf.some((p) => user.permissions.includes(p));

/**
 * Pages call this first: staff without the permission go back to the overview (which only shows what they may open).
 * Laravel checks every request again, so this is for a clean screen, not for security.
 */
export async function requirePermission(locale: string, ...anyOf: string[]): Promise<AuthUser> {
  const user = await getAdminUser(locale);
  if (!isStaff(user) || !can(user, ...anyOf)) redirect(`/${locale}/admin`);
  return user;
}

/** GET that treats a 403 from Laravel as "not allowed" instead of an error page. */
export async function adminGetOrForbidden<T>(path: string, locale: string): Promise<T | 'forbidden'> {
  try {
    const result = await adminGet<T>(path, locale);
    if (result === null) throw new ApiHttpError(404, `API 404 on GET ${path}`);
    return result;
  } catch (error) {
    if (error instanceof ApiHttpError && error.status === 403) return 'forbidden';
    throw error;
  }
}
