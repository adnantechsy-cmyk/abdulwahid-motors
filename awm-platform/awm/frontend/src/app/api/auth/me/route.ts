import { NextResponse, type NextRequest } from 'next/server';
import { clearedCookie, currentUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await currentUser(request);
  if (user) return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });

  // An expired or revoked token: drop the stale cookie so middleware stops treating the visitor as signed in.
  const response = NextResponse.json({ user: null }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  if (request.cookies.has(clearedCookie.name)) response.cookies.set(clearedCookie);
  return response;
}
