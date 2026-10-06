import { NextResponse, type NextRequest } from 'next/server';
import { clearedCookie, revokeToken } from '@/lib/auth-server';
import { rejectCrossOrigin } from '@/lib/same-origin';

export async function POST(request: NextRequest) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  await revokeToken(request);
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(clearedCookie);
  return response;
}
