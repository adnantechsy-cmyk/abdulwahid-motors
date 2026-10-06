import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Defence in depth against cross-site form posts. The session cookie is already SameSite=Lax, which stops browsers
 * sending it on a cross-site POST; this also refuses any state-changing request whose Origin is a different site.
 * Requests without an Origin header (some privacy tools, server-to-server) are allowed: they can't carry the cookie
 * from another site anyway.
 */
export function rejectCrossOrigin(request: NextRequest): NextResponse | null {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return null;

  const origin = request.headers.get('origin');
  if (!origin) return null;

  const site = process.env.NEXT_PUBLIC_SITE_URL ? safeHost(process.env.NEXT_PUBLIC_SITE_URL) : null;
  const allowed = new Set([request.nextUrl.host, request.headers.get('host'), request.headers.get('x-forwarded-host'), site].filter((h): h is string => Boolean(h)));

  return allowed.has(safeHost(origin) ?? '') ? null : NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
