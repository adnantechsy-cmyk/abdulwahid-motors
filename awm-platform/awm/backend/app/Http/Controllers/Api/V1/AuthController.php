<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * Token auth for customers and staff (Figma: login 1:7077, register 1:6707).
 * Next.js keeps the token in an httpOnly cookie and sends it as a Bearer header.
 */
class AuthController extends Controller
{
    /** POST /api/v1/auth/register */
    public function register(Request $request)
    {
        // Normalise first so "0944..." and "+963944..." can't register twice.
        if ($request->filled('phone')) {
            $request->merge(['phone' => $this->normalisePhone((string) $request->input('phone'))]);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9 ]{7,20}$/', 'unique:users,phone'],
            'email' => ['nullable', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'locale' => ['nullable', 'in:ar,en'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'password' => $data['password'],
            'locale' => $data['locale'] ?? app()->getLocale(),
        ]);

        return response()->json($this->tokenResponse($user, $request), 201);
    }

    /** POST /api/v1/auth/login  {login: phone or email, password} */
    public function login(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:190'],
            'password' => ['required', 'string'],
        ]);

        $user = str_contains($data['login'], '@')
            ? User::where('email', $data['login'])->first()
            : User::where('phone', $this->normalisePhone($data['login']))->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['login' => [__('auth.failed')]]);
        }
        if (! $user->is_active) {
            throw ValidationException::withMessages(['login' => ['This account is disabled.']]);
        }

        return $this->tokenResponse($user, $request);
    }

    /** POST /api/v1/auth/logout */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->noContent();
    }

    /** GET /api/v1/auth/me */
    public function me(Request $request)
    {
        return $this->userArray($request->user());
    }

    private function tokenResponse(User $user, Request $request): array
    {
        $device = substr((string) $request->userAgent(), 0, 100) ?: 'web';

        return [
            'token' => $user->createToken($device, ['*'], now()->addDays(30))->plainTextToken,
            'user' => $this->userArray($user),
        ];
    }

    private function userArray(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'email' => $user->email,
            'locale' => $user->locale,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ];
    }

    private function normalisePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);
        // Syrian mobile numbers: 09XXXXXXXX or 9639XXXXXXXX -> +9639XXXXXXXX
        if (str_starts_with($digits, '09') && strlen($digits) === 10) {
            return '+963' . substr($digits, 1);
        }

        return '+' . ltrim($digits, '+');
    }
}
