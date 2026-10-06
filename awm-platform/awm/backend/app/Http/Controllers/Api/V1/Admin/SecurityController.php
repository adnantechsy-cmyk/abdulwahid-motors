<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\Auth\TwoFactorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

/** A staff member's own security settings: set up, check, replace or switch off the authenticator app. */
class SecurityController extends Controller
{
    public function __construct(private TwoFactorService $twoFactor) {}

    /** GET /admin/security/2fa */
    public function status(Request $request)
    {
        return $this->state($request);
    }

    /** POST /admin/security/2fa/setup: new secret (not active until confirmed). Refused while one is already active. */
    public function setup(Request $request)
    {
        $user = $request->user();
        abort_unless($user->isStaff(), 403);
        abort_if($user->hasTwoFactor(), 422, 'Two-factor authentication is already on. Switch it off first to set it up again.');

        return $this->twoFactor->begin($user);
    }

    /** POST /admin/security/2fa/confirm  {code}: returns the recovery codes, once. */
    public function confirm(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:12']]);
        $this->throttle($request);

        $codes = $this->twoFactor->confirm($request->user(), $data['code']);
        if ($codes === null) {
            RateLimiter::hit($this->key($request), 900);

            return response()->json(['message' => 'That code is not correct.', 'errors' => ['code' => ['That code is not correct.']]], 422);
        }

        return ['recovery_codes' => $codes] + $this->state($request);
    }

    /** POST /admin/security/2fa/recovery-codes  {password, code}: replaces the 8 codes. */
    public function recoveryCodes(Request $request)
    {
        $this->assertReauthenticated($request);

        return ['recovery_codes' => $this->twoFactor->regenerateRecoveryCodes($request->user())] + $this->state($request);
    }

    /** POST /admin/security/2fa/disable  {password, code}. Not allowed while the shop requires 2FA for staff. */
    public function disable(Request $request)
    {
        abort_if(config('awm.two_factor.required'), 422, 'Two-factor authentication is required for staff and cannot be switched off.');
        $this->assertReauthenticated($request);

        $this->twoFactor->disable($request->user());

        return $this->state($request);
    }

    /** Sensitive changes need the password and a fresh code, so a stolen session alone is not enough. */
    private function assertReauthenticated(Request $request): void
    {
        $data = $request->validate(['password' => ['required', 'string'], 'code' => ['required', 'string', 'max:12']]);
        $this->throttle($request);
        $user = $request->user();

        $ok = Hash::check($data['password'], $user->password) && $user->hasTwoFactor() && $this->twoFactor->check($user, $data['code'], null);
        if (! $ok) {
            RateLimiter::hit($this->key($request), 900);
            abort(422, 'The password or the code is not correct.');
        }
    }

    private function throttle(Request $request): void
    {
        abort_if(RateLimiter::tooManyAttempts($this->key($request), 5), 429, 'Too many attempts. Try again later.');
    }

    private function key(Request $request): string
    {
        return '2fa-manage:' . $request->user()->id;
    }

    private function state(Request $request): array
    {
        $user = $request->user()->fresh();

        return [
            'enabled' => $user->hasTwoFactor(),
            'pending_setup' => $user->two_factor_secret !== null && ! $user->hasTwoFactor(),
            'required' => (bool) config('awm.two_factor.required'),
            'recovery_codes_left' => $user->hasTwoFactor() ? $this->twoFactor->recoveryCodesLeft($user) : 0,
        ];
    }
}
