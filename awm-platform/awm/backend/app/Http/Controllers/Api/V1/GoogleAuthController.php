<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * "Sign in with Google" for customers. The browser gets a Google ID token (a signed credential) from Google's
 * button and posts it here; we check it with Google, then log the person in with the same Sanctum token as a
 * password login. Staff accounts can NOT sign in this way: they must use their password.
 */
class GoogleAuthController extends Controller
{
    /** POST /auth/google  {credential: Google ID token} */
    public function login(Request $request, AuthController $auth)
    {
        $clientId = config('awm.google.client_id');
        if (blank($clientId)) {
            return response()->json(['message' => 'Google sign-in is not configured.', 'code' => 'google_disabled'], 503);
        }

        $data = $request->validate(['credential' => ['required', 'string', 'max:4096']]);

        try {
            $res = Http::timeout(8)->get('https://oauth2.googleapis.com/tokeninfo', ['id_token' => $data['credential']]);
        } catch (ConnectionException) {
            return response()->json(['message' => 'Could not reach Google. Try again.', 'code' => 'google_unreachable'], 503);
        }

        $claims = $res->ok() ? $res->json() : null;

        // Google already checks the signature and expiry; we check the token was issued for THIS site and the email is verified.
        $valid = is_array($claims)
            && ($claims['aud'] ?? null) === $clientId
            && in_array($claims['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)
            && filter_var($claims['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN)
            && filled($claims['email'] ?? null)
            && filled($claims['sub'] ?? null)
            && (int) ($claims['exp'] ?? 0) > time();

        if (! $valid) {
            return response()->json(['message' => 'Google sign-in failed.', 'code' => 'google_invalid'], 401);
        }

        $email = Str::lower($claims['email']);
        $user = User::where('google_id', $claims['sub'])->first() ?? User::where('email', $email)->first();

        if ($user?->isStaff()) {
            return response()->json(['message' => 'Staff accounts sign in with their password.', 'code' => 'staff_use_password'], 403);
        }

        if ($user) {
            if (! $user->is_active) {
                return response()->json(['message' => 'This account is disabled.', 'code' => 'inactive'], 403);
            }
            if (! $user->google_id) {
                // Same verified email: link the Google identity to the existing customer account.
                $user->forceFill(['google_id' => $claims['sub'], 'email_verified_at' => $user->email_verified_at ?? now()])->save();
            }
        } else {
            $user = new User([
                'name' => Str::limit($claims['name'] ?? Str::before($email, '@'), 120, ''),
                'email' => $email,
                'password' => Str::random(48),   // nobody knows it; "forgot password" sets a real one
                'locale' => $request->header('X-Locale') === 'en' ? 'en' : 'ar',
            ]);
            $user->forceFill(['google_id' => $claims['sub'], 'email_verified_at' => now()])->save();
        }

        return response()->json($auth->tokenResponse($user, $request));
    }
}
