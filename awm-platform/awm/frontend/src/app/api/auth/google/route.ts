import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth-server';

/** Google sign-in: the browser posts the Google ID token; Laravel verifies it and we set the session cookie. */
export const POST = (request: NextRequest) => authenticate(request, '/auth/google', ['credential']);
