import { NextResponse, type NextRequest } from 'next/server';
import { clearedCookie, revokeToken } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  await revokeToken(request);
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(clearedCookie);
  return response;
}
