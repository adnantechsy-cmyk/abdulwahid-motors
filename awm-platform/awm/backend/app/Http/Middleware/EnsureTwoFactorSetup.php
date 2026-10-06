<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * When AWM_2FA_REQUIRED is on, a staff member who has not set up their authenticator app can only reach the
 * security screen (to set it up). Everything else in the admin answers 403 `two_factor_setup_required`.
 */
class EnsureTwoFactorSetup
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->requiresTwoFactorSetup() && ! $request->is('api/v1/admin/security/*')) {
            return response()->json([
                'message' => 'Set up two-factor authentication to continue.',
                'code' => 'two_factor_setup_required',
            ], 403);
        }

        return $next($request);
    }
}