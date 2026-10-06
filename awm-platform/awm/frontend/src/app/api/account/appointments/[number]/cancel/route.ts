import { NextResponse, type NextRequest } from 'next/server';
import { API_BASE } from '@/lib/api/server';
import { AUTH_COOKIE } from '@/lib/auth';

/** Cancel one of the signed-in customer's appointments. The token stays server-side. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthenticated.' }, { status: 401 });

  const { number } = await params;
  // Appointment numbers look like APT-2026-000012; refuse anything else before it reaches a URL.
  if (!/^[A-Z0-9-]{3,40}$/.test(number)) return NextResponse.json({ message: 'Not found.' }, { status: 404 });

  try {
    const res = await fetch(`${API_BASE}/account/appointments/${number}/cancel`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'X-Locale': request.headers.get('x-locale') === 'en' ? 'en' : 'ar' },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(res.ok ? data : { message: data.message }, { status: res.status });
  } catch {
    return NextResponse.json({ message: 'Service unavailable.' }, { status: 503 });
  }
}
