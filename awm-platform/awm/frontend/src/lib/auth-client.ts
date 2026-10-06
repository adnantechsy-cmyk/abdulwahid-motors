'use client';

export type FieldErrors = Record<string, string>;

export type SubmitResult =
  | { ok: true }
  | { ok: false; fieldErrors: FieldErrors; message?: string; kind: 'validation' | 'throttled' | 'unavailable' | 'unknown' };

/** POST JSON to one of our /api/auth/* route handlers and normalise Laravel's error shape. */
export async function postAuth(path: 'login' | 'register', body: Record<string, unknown>, locale: string): Promise<SubmitResult> {
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

  if (res.ok) return { ok: true };

  const data = await res.json().catch(() => ({}));
  if (res.status === 422 && data.errors) {
    const fieldErrors = Object.fromEntries(
      Object.entries(data.errors as Record<string, string[]>).map(([field, messages]) => [field, messages[0]]),
    );
    return { ok: false, fieldErrors, kind: 'validation' };
  }
  if (res.status === 429) return { ok: false, fieldErrors: {}, kind: 'throttled' };
  if (res.status >= 500) return { ok: false, fieldErrors: {}, kind: 'unavailable' };
  return { ok: false, fieldErrors: {}, message: data.message, kind: 'unknown' };
}
