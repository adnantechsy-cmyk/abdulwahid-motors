<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/** Everything about a staff member's authenticator app: enrol, check codes, recovery codes, switch off. */
class TwoFactorService
{
    /** Start (or restart) enrolment. The secret is stored but not active until confirm() succeeds. */
    public function begin(User $user): array
    {
        $secret = Totp::generateSecret();
        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_last_step' => null,
        ])->save();

        return [
            'secret' => $secret,
            'otpauth_uri' => Totp::uri($secret, $user->email ?? $user->phone ?? "user-{$user->id}", config('awm.name.en')),
        ];
    }

    /** First valid code turns 2FA on and returns the one-time recovery codes (shown to the user once). */
    public function confirm(User $user, string $code): ?array
    {
        if (! $user->two_factor_secret || $user->two_factor_confirmed_at) {
            return null;
        }
        $step = Totp::verify($user->two_factor_secret, $code);
        if ($step === null) {
            return null;
        }

        $user->forceFill(['two_factor_confirmed_at' => now(), 'two_factor_last_step' => $step])->save();

        return $this->regenerateRecoveryCodes($user);
    }

    /** 8 codes like "k3f9x-2mqzd". Only their hashes are kept. */
    public function regenerateRecoveryCodes(User $user): array
    {
        $plain = collect(range(1, 8))->map(fn () => Str::lower(Str::random(5)) . '-' . Str::lower(Str::random(5)))->all();
        $user->forceFill(['two_factor_recovery_codes' => json_encode(array_map(fn ($c) => Hash::make($c), $plain))])->save();

        return $plain;
    }

    /** Login check: an authenticator code (never reused) or one unused recovery code. */
    public function check(User $user, ?string $code, ?string $recovery): bool
    {
        if (! $user->hasTwoFactor()) {
            return false;
        }

        if ($code) {
            $step = Totp::verify($user->two_factor_secret, $code);
            if ($step !== null && ($user->two_factor_last_step === null || $step > $user->two_factor_last_step)) {
                $user->forceFill(['two_factor_last_step' => $step])->save();

                return true;
            }

            return false;
        }

        if ($recovery) {
            $hashes = json_decode((string) $user->two_factor_recovery_codes, true) ?: [];
            $given = Str::lower(trim($recovery));
            foreach ($hashes as $i => $hash) {
                if (Hash::check($given, $hash)) {
                    unset($hashes[$i]);                       // each recovery code works once
                    $user->forceFill(['two_factor_recovery_codes' => json_encode(array_values($hashes))])->save();

                    return true;
                }
            }
        }

        return false;
    }

    public function disable(User $user): void
    {
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_last_step' => null,
        ])->save();
    }

    public function recoveryCodesLeft(User $user): int
    {
        return count(json_decode((string) $user->two_factor_recovery_codes, true) ?: []);
    }
}