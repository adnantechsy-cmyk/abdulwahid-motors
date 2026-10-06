import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth-server';

/** Second step of a staff login: the authenticator code (or a recovery code) that follows the password. */
export const POST = (request: NextRequest) => authenticate(request, '/auth/2fa/verify', ['challenge', 'code', 'recovery_code']);