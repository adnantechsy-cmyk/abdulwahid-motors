'use client';

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; status: number; message: string; code?: string };

/**
 * Staff action through the /api/admin proxy. `path` is what follows /api/admin/ (for example
 * `payments/<uuid>/confirm`). A 401 means the session ended: go through the cookie-clearing route to log in again.
 */
export async function adminAction<T = unknown>(
  method: 'POST' | 'PUT',
  path: string,
  locale: string,
  body?: unknown,
): Promise<ActionResult<T>> {
  let res: Response;
  try {
    res = await fetch(`/api/admin/${path}`, {
      method,
      headers: { Accept: 'application/json', 'X-Locale': locale, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, message: '' };
  }

  if (res.status === 401) {
    window.location.assign(`/api/auth/expired?next=${encodeURIComponent(`/${locale}/admin`)}`);
    return { ok: false, status: 401, message: '' };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const first = data?.errors ? (Object.values(data.errors as Record<string, string[]>)[0]?.[0] ?? '') : '';
    return { ok: false, status: res.status, message: first || data?.message || '', code: data?.code };
  }
  return { ok: true, data: data as T };
}
