'use client';

import { ApiError, getCartToken, setCartToken } from './client';

/**
 * Browser calls for cart, checkout and payment. They go through our own /api/shop proxy, which adds the
 * customer's session (httpOnly cookie) when there is one. Guests carry the cart token instead.
 * Returns the parsed JSON; throws ApiError (with Laravel's `errors` / `code`) on failure.
 */
export async function shopFetch<T>(
  path: string,
  init: Omit<RequestInit, 'body'> & { locale?: string; json?: unknown; form?: FormData; headers?: Record<string, string> } = {},
): Promise<T> {
  const { locale, json, form, headers, ...rest } = init;
  const cartToken = getCartToken();

  const res = await fetch(`/api/shop/${path}`, {
    ...rest,
    body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
    headers: {
      Accept: 'application/json',
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(locale ? { 'X-Locale': locale } : {}),
      ...(cartToken ? { 'X-Cart-Token': cartToken } : {}),
      ...headers,
    },
  });

  const returned = res.headers.get('X-Cart-Token');
  if (returned) setCartToken(returned);

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.message ?? `Request failed (${res.status})`, res.status, body.code, body.errors);

  return body as T;
}
