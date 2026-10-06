<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\PasswordChangedMail;
use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Throwable;

/**
 * Forgot / reset password for customers AND staff (staff are ordinary users with a role, so they share the flow).
 * The email carries a one-time link to the website; the token is Laravel's own password-broker token (hashed in
 * the database, expires per config/auth.php, single use).
 */
class PasswordResetController extends Controller
{
    /**
     * POST /auth/forgot-password  {login: email or phone}
     * Always answers the same way, so the form can't be used to find out which accounts exist.
     */
    public function forgot(Request $request)
    {
        $data = $request->validate(['login' => ['required', 'string', 'max:190']]);

        $user = str_contains($data['login'], '@')
            ? User::where('email', $data['login'])->first()
            : User::where('phone', $this->normalisePhone($data['login']))->first();

        // Only active accounts that have an email on file can receive a link.
        if ($user && $user->is_active && filled($user->email)) {
            try {
                PasswordBroker::sendResetLink(['email' => $user->email], function (User $u, string $token) use ($request) {
                    $locale = in_array($u->locale, ['ar', 'en'], true) ? $u->locale : ($request->header('X-Locale') === 'en' ? 'en' : 'ar');
                    $url = rtrim(config('awm.frontend_url'), '/') . "/{$locale}/reset-password?" . http_build_query(['token' => $token, 'email' => $u->email]);
                    Mail::to($u->email)->send(new PasswordResetMail($u, $url, $locale, $u->isStaff()));
                });
            } catch (Throwable $e) {
                // Mail trouble must not reveal anything to the visitor; it is logged for the team.
                Log::warning('Password reset mail failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            }
        }

        return response()->json(['status' => 'sent'], 202);
    }

    /** POST /auth/reset-password  {email, token, password, password_confirmation} */
    public function reset(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string', 'max:200'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $changed = null;

        $status = PasswordBroker::reset(
            $data + ['password_confirmation' => $request->input('password_confirmation')],
            function (User $user, string $password) use (&$changed) {
                $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
                $user->tokens()->delete();            // every signed-in device has to log in again
                $changed = $user;
                event(new PasswordReset($user));
            },
        );

        if ($status !== PasswordBroker::PASSWORD_RESET) {
            return response()->json([
                'message' => 'This reset link is invalid or has expired.',
                'code' => 'invalid_token',
                'errors' => ['token' => ['This reset link is invalid or has expired.']],
            ], 422);
        }

        // Tell the owner, so a reset they did not ask for does not go unnoticed.
        try {
            $locale = in_array($changed->locale, ['ar', 'en'], true) ? $changed->locale : 'ar';
            Mail::to($changed->email)->send(new PasswordChangedMail($changed, $locale));
        } catch (Throwable $e) {
            Log::warning('Password changed mail failed', ['user_id' => $changed->id, 'error' => $e->getMessage()]);
        }

        return response()->json(['status' => 'reset']);
    }

    private function normalisePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);
        if (str_starts_with($digits, '09') && strlen($digits) === 10) {
            return '+963' . substr($digits, 1);
        }

        return '+' . ltrim($digits, '+');
    }
}
