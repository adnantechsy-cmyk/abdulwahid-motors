import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth-server';

export const POST = (request: NextRequest) => authenticate(request, '/auth/login', ['login', 'password']);
