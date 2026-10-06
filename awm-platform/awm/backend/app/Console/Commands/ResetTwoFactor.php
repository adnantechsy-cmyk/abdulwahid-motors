<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Auth\TwoFactorService;
use Illuminate\Console\Command;

/** Emergency way back in for a staff member who lost their phone and their recovery codes. Needs server access. */
class ResetTwoFactor extends Command
{
    protected $signature = 'awm:2fa-reset {email : The staff member\'s email}';

    protected $description = 'Switch off two-factor authentication for one user (they can set it up again at next login)';

    public function handle(TwoFactorService $twoFactor): int
    {
        $user = User::where('email', $this->argument('email'))->first();
        if (! $user) {
            $this->error('No user with that email.');

            return self::FAILURE;
        }

        $twoFactor->disable($user);
        $user->tokens()->delete();
        $this->info("Two-factor authentication is off for {$user->email}. All their sessions were signed out.");

        return self::SUCCESS;
    }
}