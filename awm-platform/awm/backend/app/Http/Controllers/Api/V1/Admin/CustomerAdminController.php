<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomerVehicle;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Customers (not staff): find them, open an account for someone who booked as a guest, and register their cars.
 * Staff accounts never appear here.
 */
class CustomerAdminController extends Controller
{
    /** GET /admin/customers?q=  (name, phone or email) */
    public function index(Request $request)
    {
        $data = $request->validate(['q' => ['nullable', 'string', 'max:60']]);
        $q = $data['q'] ?? null;

        return User::query()
            ->whereDoesntHave('roles')
            ->when($q, fn ($query) => $query->where(fn ($w) => $w
                ->where('name', 'like', "%{$q}%")
                ->orWhere('phone', 'like', '%' . preg_replace('/\D/', '', $q) . '%')
                ->orWhere('email', 'like', "%{$q}%")))
            ->withCount(['ownedVehicles', 'orders'])
            ->latest('id')
            ->paginate(20)
            ->through(fn (User $u) => $this->row($u));
    }

    /** GET /admin/customers/{user} */
    public function show(User $user)
    {
        abort_if($user->isStaff(), 404);
        $user->loadCount(['ownedVehicles', 'orders']);

        return $this->row($user) + [
            'cars' => $user->ownedVehicles()->latest('id')->get()->map(fn (CustomerVehicle $v) => $this->car($v))->values(),
            'orders' => $user->orders()->latest('id')->limit(5)->get()->map(fn ($o) => [
                'number' => $o->number,
                'flow' => $o->flow->value,
                'status' => $o->status->value,
                'grand_total' => (string) $o->grand_total,
                'currency' => $o->currency,
                'placed_at' => $o->placed_at?->toAtomString(),
            ])->values(),
            'appointments' => $user->appointments()->latest('starts_at')->limit(5)->get()->map(fn ($a) => [
                'number' => $a->number,
                'status' => $a->status->value,
                'branch' => $a->branch,
                'service_type' => $a->service_type,
                'starts_at' => $a->starts_at->toIso8601String(),
            ])->values(),
        ];
    }

    /**
     * POST /admin/customers  {name, phone, email?}
     * Opens an account for a customer who booked as a guest. A temporary password is made and returned ONCE:
     * give it to the customer, who can then sign in with their phone and change it.
     */
    public function store(Request $request)
    {
        if ($request->filled('phone')) {
            $request->merge(['phone' => $this->normalisePhone((string) $request->input('phone'))]);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9 ]{7,20}$/', 'unique:users,phone'],
            'email' => ['nullable', 'email', 'max:190', 'unique:users,email'],
            'locale' => ['nullable', 'in:ar,en'],
        ]);

        $password = Str::password(12, symbols: false);
        $user = User::create([
            'name' => $data['name'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'password' => $password,
            'locale' => $data['locale'] ?? 'ar',
        ]);

        return response()->json($this->row($user->loadCount(['ownedVehicles', 'orders'])) + ['temporary_password' => $password], 201);
    }

    /** POST /admin/customers/{user}/vehicles  register a car the customer owns */
    public function addVehicle(Request $request, User $user)
    {
        abort_if($user->isStaff(), 404);

        $data = $request->validate([
            'make' => ['nullable', 'string', 'max:40'],
            'model' => ['required', 'string', 'max:60'],
            'model_year' => ['nullable', 'integer', 'between:1990,2100'],
            'vin' => ['nullable', 'string', 'size:17', 'alpha_num', 'unique:customer_vehicles,vin'],
            'plate_number' => ['nullable', 'string', 'max:30'],
            'color' => ['nullable', 'string', 'max:40'],
            'last_mileage_km' => ['nullable', 'integer', 'min:0'],
            'purchased_at' => ['nullable', 'date'],
            'warranty_until' => ['nullable', 'date'],
            'vehicle_id' => ['nullable', 'exists:vehicles,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $car = $user->ownedVehicles()->create(array_filter($data + ['make' => 'BYD'], fn ($v) => $v !== null && $v !== '') + ['make' => 'BYD']);

        return response()->json($this->car($car), 201);
    }

    private function row(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'phone' => $u->phone,
            'email' => $u->email,
            'locale' => $u->locale,
            'is_active' => (bool) $u->is_active,
            'cars_count' => $u->owned_vehicles_count ?? $u->ownedVehicles()->count(),
            'orders_count' => $u->orders_count ?? $u->orders()->count(),
            'created_at' => $u->created_at?->toAtomString(),
        ];
    }

    private function car(CustomerVehicle $v): array
    {
        return [
            'id' => $v->id,
            'make' => $v->make,
            'model' => $v->model,
            'model_year' => $v->model_year,
            'vin' => $v->vin,
            'plate_number' => $v->plate_number,
            'color' => $v->color,
            'last_mileage_km' => $v->last_mileage_km,
            'purchased_at' => $v->purchased_at?->toDateString(),
            'warranty_until' => $v->warranty_until?->toDateString(),
        ];
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