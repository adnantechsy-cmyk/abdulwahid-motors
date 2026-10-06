<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/** Staff accounts and roles (users.manage). */
class StaffAdminController extends Controller
{
    private const ROLES = ['admin', 'sales', 'technician', 'inventory'];

    public function index()
    {
        return User::whereHas('roles')->with('roles')->orderBy('name')->get()->map(fn (User $u) => $this->row($u));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $user = User::create(collect($data)->except('role')->all());
        $user->syncRoles([$data['role']]);

        return response()->json($this->row($user), 201);
    }

    public function update(Request $request, User $staff)
    {
        abort_unless($staff->roles()->exists(), 404);
        $data = $this->validated($request, $staff);
        $self = $request->user()->is($staff);

        $losingAdmin = $staff->hasRole('admin') && ((isset($data['role']) && $data['role'] !== 'admin') || (array_key_exists('is_active', $data) && ! $data['is_active']));
        if ($losingAdmin && ($self || User::role('admin')->where('is_active', true)->count() <= 1)) {
            abort(422, $self ? 'You cannot remove your own admin access.' : 'At least one active admin is required.');
        }

        $staff->forceFill(collect($data)->except('role')->all())->save();
        if (isset($data['role'])) {
            $staff->syncRoles([$data['role']]);
        }
        if ((array_key_exists('is_active', $data) && ! $data['is_active']) || isset($data['password'])) {
            $staff->tokens()->delete(); // force re-login
        }

        return $this->row($staff->fresh('roles'));
    }

    private function validated(Request $request, ?User $u = null): array
    {
        if ($request->filled('phone')) {
            $request->merge(['phone' => Phone::normalise($request->input('phone'))]);
        }

        return $request->validate([
            'name' => [$u ? 'sometimes' : 'required', 'string', 'max:120'],
            'email' => [$u ? 'sometimes' : 'required', 'email', 'max:190', Rule::unique('users')->ignore($u?->id)],
            'phone' => ['nullable', 'string', 'max:30', Rule::unique('users')->ignore($u?->id)],
            'password' => [$u ? 'nullable' : 'required', Password::min(10)],
            'role' => [$u ? 'sometimes' : 'required', Rule::in(self::ROLES)],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    private function row(User $u): array
    {
        return $u->only(['id', 'name', 'email', 'phone', 'is_active']) + [
            'role' => $u->getRoleNames()->first(),
            'last_login_at' => $u->tokens()->max('last_used_at'),
        ];
    }
}
