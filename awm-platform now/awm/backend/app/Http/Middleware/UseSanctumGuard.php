<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * "Optional login" for public endpoints (cart, checkout, pay).
 * Without this, $request->user() on a route without auth:sanctum resolves the default
 * `web` guard and is always null, so logged-in customers would be treated as guests.
 * With it, a valid Bearer token identifies the user and no token simply means guest.
 */
class UseSanctumGuard
{
    public function handle(Request $request, Closure $next): Response
    {
        auth()->shouldUse('sanctum');

        return $next($request);
    }
}
