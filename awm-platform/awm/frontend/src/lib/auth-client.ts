'use client';

export type FieldErrors = Record<string, string>;

export type SubmitResult =
  | { ok: true; twoFactor?: { challenge: string } }
  | { ok: false; fieldErrors: FieldErrors; message?: string; code?: string; kind: 'validation' | 'throttled' | 'unavailable' | 'unknown' };

/** POST JSON to one of our /api/auth/* route handlers and normalise Laravel's error shape. */
export async function postAuth(path: 'login' | 'register' | 'google' | 'forgot-password' | 'reset-password' | 'two-factor', body: Record<string, unknown>, locale: string): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Locale': locale },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, fieldErrors: {}, kind: 'unavailable' };
  }

  if (res.ok) {
    if (res.status === 202) {
      const d = await res.json().catch(() => ({}));
      if (d.two_factor && typeof d.challenge === 'string') return { ok: true, twoFactor: { challenge: d.challenge } };
    }
    return { ok: true };
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 422 && data.errors) {
    const fieldErrors = Object.fromEntries(
      Object.entries(data.errors as Record<string, string[]>).map(([field, messages]) => [field, messages[0]]),
    );
    return { ok: false, fieldErrors, code: data.code, kind: 'validation' };
  }
  if (res.status === 429) return { ok: false, fieldErrors: {}, kind: 'throttled' };
  if (res.status >= 500) return { ok: false, fieldErrors: {}, kind: 'unavailable' };
  return { ok: false, fieldErrors: {}, message: data.message, code: data.code, kind: 'unknown' };
}
