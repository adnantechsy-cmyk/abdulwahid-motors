<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\TwoFactorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Throwable;

/** Second step of a staff login: the 6-digit code (or a recovery code) that follows the password. */
class TwoFactorChallengeController extends Controller
{
    private const MAX_FAILURES = 5;
    private const LOCK_SECONDS = 900;

    public function __construct(private TwoFactorService $twoFactor) {}

    /** POST /auth/2fa/verify  {challenge, code | recovery_code} */
    public function verify(Request $request, AuthController $auth)
    {
        $data = $request->validate([
            'challenge' => ['required', 'string', 'max:2000'],
            'code' => ['nullable', 'string', 'max:12', 'required_without:recovery_code'],
            'recovery_code' => ['nullable', 'string', 'max:30', 'required_without:code'],
        ]);

        $user = $this->userFromChallenge($data['challenge']);
        if (! $user || ! $user->is_active || ! $user->hasTwoFactor()) {
            throw ValidationException::withMessages(['code' => ['This sign-in has expired. Log in again.']]);
        }

        // Five wrong codes lock this account's second step for 15 minutes, whatever IP they come from.
        $key = "2fa:{$user->id}";
        if (RateLimiter::tooManyAttempts($key, self::MAX_FAILURES)) {
            return response()->json(['message' => 'Too many wrong codes. Try again later.', 'code' => 'two_factor_locked'], 429);
        }

        if (! $this->twoFactor->check($user, $data['code'] ?? null, $data['recovery_code'] ?? null)) {
            RateLimiter::hit($key, self::LOCK_SECONDS);
            throw ValidationException::withMessages(['code' => ['That code is not correct.']]);
        }

        RateLimiter::clear($key);

        return $auth->tokenResponse($user, $request);
    }

    /** The challenge is an encrypted, 5-minute note saying "this password was just accepted for user N". */
    private function userFromChallenge(string $challenge): ?User
    {
        try {
            $payload = json_decode(Crypt::decryptString($challenge), true);
        } catch (Throwable) {
            return null;
        }

        if (! is_array($payload) || ($payload['exp'] ?? 0) < time()) {
            return null;
        }

        return User::find($payload['uid'] ?? 0);
    }
}
