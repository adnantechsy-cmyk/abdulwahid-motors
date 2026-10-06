'use client';

// Same-origin proxy (src/app/api/backend): attaches the login cookie's token server-side.
const BASE = '/api/backend';
const CART_TOKEN_KEY = 'awm-cart-token';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public errors?: Record<string, string[]>) {
    super(message);
  }
}

export const getCartToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(CART_TOKEN_KEY));
export const setCartToken = (t: string | null) => {
  if (typeof window === 'undefined') return;
  if (t) localStorage.setItem(CART_TOKEN_KEY, t);
  else localStorage.removeItem(CART_TOKEN_KEY);
};

/** Browser calls to Laravel via the proxy. Guests carry the cart token; logged-in users are identified by cookie. */
export async function apiFetch<T>(path: string, init: RequestInit & { locale?: string } = {}): Promise<T> {
  const { locale, headers, ...rest } = init;
  const cartToken = getCartToken();

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(rest.body && !(rest.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(locale ? { 'X-Locale': locale } : {}),
      ...(cartToken ? { 'X-Cart-Token': cartToken } : {}),
      ...headers,
    },
  });

  const returned = res.headers.get('X-Cart-Token');
  if (returned) setCartToken(returned);

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.message ?? `Request failed (${res.status})`, res.status, body.code, body.errors);

  return body as T;
}
