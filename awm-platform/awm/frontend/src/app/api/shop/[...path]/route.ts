import { NextResponse, type NextRequest } from 'next/server';
import { API_BASE } from '@/lib/api/server';
import { AUTH_COOKIE } from '@/lib/auth';

/**
 * Same-origin proxy for the guest-or-customer shop calls (cart, checkout, payment).
 * The browser can't read the httpOnly session cookie, so this adds `Authorization: Bearer` for signed-in
 * customers; guests send their X-Cart-Token / order phone instead. Only the exact calls below are
 * forwarded, so this can't be used to reach any other Laravel route.
 */
const ORDER = '[A-Za-z0-9-]{3,40}';
const UUID = '[0-9a-fA-F-]{36}';
const ROUTES: { method: string; pattern: RegExp }[] = [
  { method: 'PUT', pattern: /^cart$/ },
  { method: 'POST', pattern: /^checkout$/ },
  { method: 'GET', pattern: new RegExp(`^orders/${ORDER}/payment-methods$`) },
  { method: 'POST', pattern: new RegExp(`^orders/${ORDER}/pay$`) },
  { method: 'POST', pattern: new RegExp(`^payments/${UUID}/proof$`) },
];

const FORWARD_HEADERS = ['content-type', 'accept', 'x-cart-token', 'x-locale', 'idempotency-key', 'x-customer-phone'];
const MAX_BODY = 6 * 1024 * 1024; // receipts are capped at 5 MB by Laravel

async function handle(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join('/');
  if (!ROUTES.some((r) => r.method === request.method && r.pattern.test(path))) {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  }

  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY) return NextResponse.json({ message: 'File too large.' }, { status: 413 });

  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (token) headers.set('authorization', `Bearer ${token}`);

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/${path}`, {
      method: request.method,
      headers,
      body: request.method === 'GET' ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'Service unavailable.' }, { status: 503 });
  }

  const response = new NextResponse(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status });
  const type = upstream.headers.get('content-type');
  if (type) response.headers.set('content-type', type);
  const cartToken = upstream.headers.get('x-cart-token');
  if (cartToken) response.headers.set('x-cart-token', cartToken);
  response.headers.set('cache-control', 'no-store');
  return response;
}

export { handle as GET, handle as POST, handle as PUT };
