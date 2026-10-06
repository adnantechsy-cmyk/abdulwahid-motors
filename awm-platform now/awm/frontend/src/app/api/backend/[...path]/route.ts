import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, ROLE_HINT_COOKIE } from '@/lib/auth';

const BASE = (process.env.API_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1').replace(/\/$/, '');

/** Only these Laravel paths can be reached through the proxy. */
const ALLOWED = /^(cart|checkout|orders\/[^/]+\/(pay|payment-methods)|payments\/[^/]+\/proof|appointments(\/slots)?|account\/.+|admin\/.+|auth\/me|categories|vehicles|parts|settings|pages\/[^/]+|certificates\/[^/]+)$/;
const FORWARD_IN = ['accept', 'content-type', 'x-locale', 'x-cart-token', 'idempotency-key', 'x-customer-phone'];
const FORWARD_OUT = ['content-type', 'content-disposition', 'content-language', 'x-cart-token'];

/**
 * Browser -> Next -> Laravel. Adds the Bearer token from the httpOnly cookie, so client
 * components can call authenticated endpoints without the token ever reaching JavaScript.
 */
async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join('/');
  if (!ALLOWED.test(path)) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  const headers = new Headers();
  for (const h of FORWARD_IN) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (token) headers.set('authorization', `Bearer ${token}`);

  const upstream = await fetch(`${BASE}/${path}${request.nextUrl.search}`, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
    cache: 'no-store',
  });

  const out = new Headers();
  for (const h of FORWARD_OUT) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  const response = new NextResponse(upstream.body, { status: upstream.status, headers: out });
  if (upstream.status === 401 && token) { // expired: drop both cookies
    response.cookies.delete(AUTH_COOKIE);
    response.cookies.delete(ROLE_HINT_COOKIE);
  }

  return response;
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
