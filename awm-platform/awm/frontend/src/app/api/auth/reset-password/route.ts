import type { NextRequest } from 'next/server';
import { relay } from '@/lib/auth-server';

export const POST = (request: NextRequest) => relay(request, '/auth/reset-password', ['email', 'token', 'password', 'password_confirmation']);
