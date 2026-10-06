/** httpOnly cookie holding the Sanctum token. Shared by middleware and route handlers. */
export const AUTH_COOKIE = 'awm_token';

/** Sanctum tokens are issued for 30 days (AuthController::tokenResponse). */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type AuthUser = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  locale: string;
  roles: string[];
  permissions: string[];
  /** Staff only: whether the authenticator app is on, and whether it still has to be set up. */
  two_factor?: { enabled: boolean; setup_required: boolean };
};

/**
 * Where to send the user after signing in. `next` comes from the query string, so it must be a
 * same-site path: anything else (absolute URLs, //host, backslashes) falls back to the locale home.
 */
export function safeNextPath(next: string | null | undefined, locale: string): string {
  const fallback = `/${locale}`;
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return /^\/(ar|en)(\/|$)/.test(next) ? next : `/${locale}${next}`;
}
