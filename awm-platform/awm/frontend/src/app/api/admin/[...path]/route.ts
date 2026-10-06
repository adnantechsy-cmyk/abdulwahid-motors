import { NextResponse, type NextRequest } from 'next/server';
import { API_BASE } from '@/lib/api/server';
import { AUTH_COOKIE } from '@/lib/auth';
import { rejectCrossOrigin } from '@/lib/same-origin';

/**
 * Same-origin proxy for staff actions. The browser can't read the httpOnly session cookie, so this adds the
 * Bearer token. Only the exact calls below are forwarded; Laravel still checks the staff member's
 * permission on every one of them (this list is not an authorization layer).
 */
const NUM = '[0-9]{1,9}';
const UUID = '[0-9a-fA-F-]{36}';
const ORDER = '[A-Za-z0-9-]{3,32}';
const ROUTES: { method: string; pattern: RegExp }[] = [
  { method: 'GET', pattern: new RegExp(`^admin/payments/${UUID}/proof$`) },
  { method: 'POST', pattern: new RegExp(`^admin/payments/${UUID}/(confirm|reject)$`) },
  { method: 'PUT', pattern: new RegExp(`^admin/job-cards/${NUM}/(status|technician)$`) },
  { method: 'POST', pattern: new RegExp(`^admin/job-cards/${NUM}/complete$`) },
  { method: 'POST', pattern: new RegExp(`^admin/orders/${ORDER}/(payment|cancel)$`) },
  { method: 'PUT', pattern: new RegExp(`^admin/orders/${ORDER}/status$`) },
  { method: 'POST', pattern: /^admin\/security\/2fa\/(setup|confirm|recovery-codes|disable)$/ },
  { method: 'PUT', pattern: new RegExp(`^admin/pdi/${NUM}$`) },
  { method: 'POST', pattern: new RegExp(`^admin/pdi/${NUM}/(start|complete|deliver)$`) },
  { method: 'PUT', pattern: new RegExp(`^admin/pdi/items/${NUM}$`) },
  { method: 'POST', pattern: new RegExp(`^admin/customer-vehicles/${NUM}/battery-inspections$`) },
  { method: 'POST', pattern: new RegExp(`^admin/battery-inspections/${NUM}/revoke$`) },
  { method: 'POST', pattern: /^admin\/customers$/ },
  { method: 'POST', pattern: new RegExp(`^admin/customers/${NUM}/vehicles$`) },
  { method: 'PUT', pattern: new RegExp(`^admin/contact-messages/${NUM}$`) },
  { method: 'PUT', pattern: new RegExp(`^admin/appointments/${NUM}$`) },
  { method: 'PUT', pattern: new RegExp(`^admin/orders/${ORDER}/customer$`) },
  { method: 'POST', pattern: /^admin\/parts$/ },
  { method: 'POST', pattern: new RegExp(`^admin/parts/${NUM}/cover$`) },
  { method: 'POST', pattern: /^admin\/vehicles$/ },
  { method: 'PUT', pattern: new RegExp(`^admin/vehicles/${NUM}$`) },
  { method: 'POST', pattern: new RegExp(`^admin/vehicles/${NUM}/(brochure|cover)$`) },
  { method: 'DELETE', pattern: new RegExp(`^admin/vehicles/${NUM}/brochure$`) },
  { method: 'POST', pattern: new RegExp(`^admin/vehicles/${NUM}/gallery$`) },
  { method: 'PUT', pattern: new RegExp(`^admin/vehicles/${NUM}/gallery$`) },
  { method: 'DELETE', pattern: new RegExp(`^admin/vehicles/${NUM}/gallery/[0-9]{1,2}$`) },
  { method: 'POST', pattern: /^admin\/categories$/ },
  { method: 'PUT', pattern: new RegExp(`^admin/categories/${NUM}$`) },
  { method: 'DELETE', pattern: new RegExp(`^admin/categories/${NUM}$`) },
  { method: 'PUT', pattern: new RegExp(`^admin/parts/${NUM}$`) },
  { method: 'POST', pattern: new RegExp(`^admin/parts/${NUM}/stock$`) },
  { method: 'POST', pattern: new RegExp(`^admin/appointments/${NUM}/(confirm|cancel|no-show|check-in)$`) },
];

async function handle(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // This file is app/api/admin/[...path], so `path` is what follows /api/admin/.
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  const path = `admin/${(await params).path.join('/')}`;
  if (!ROUTES.some((r) => r.method === request.method && r.pattern.test(path))) {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  }

  // Uploads (the PDF catalogue is up to 15 MB) are the largest body staff send; Laravel enforces the exact per-file limits.
  if (Number(request.headers.get('content-length') ?? 0) > 17 * 1024 * 1024) return NextResponse.json({ message: 'File too large.' }, { status: 413 });

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthenticated.' }, { status: 401 });

  const headers = new Headers({ Accept: 'application/json', Authorization: `Bearer ${token}` });
  headers.set('X-Locale', request.headers.get('x-locale') === 'en' ? 'en' : 'ar');
  const type = request.headers.get('content-type');
  if (type) headers.set('content-type', type);

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/${path}`, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'DELETE' ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'Service unavailable.' }, { status: 503 });
  }

  const isProof = path.endsWith('/proof');
  const response = new NextResponse(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status });
  response.headers.set('content-type', upstream.headers.get('content-type') ?? 'application/json');
  response.headers.set('cache-control', 'private, no-store');
  if (isProof) {
    // A customer-uploaded file: display it, but never let it run anything.
    response.headers.set('x-content-type-options', 'nosniff');
    response.headers.set('content-security-policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox");
  }
  return response;
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };

