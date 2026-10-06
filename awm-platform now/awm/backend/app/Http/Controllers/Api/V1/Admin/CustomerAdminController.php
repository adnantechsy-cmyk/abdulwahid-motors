<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomerVehicle;
use App\Models\User;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** CRM (Figma 1:21010): customer profiles, owned vehicles, service history. */
class CustomerAdminController extends Controller
{
    /** GET /admin/customers?q= */
    public function index(Request $request)
    {
        return $this->customers()
            ->withCount(['ownedVehicles', 'invoices as unpaid_invoices_count' => fn ($q) => $q->whereIn('status', ['unpaid', 'partially_paid'])])
            ->when($request->query('q'), function ($q, $term) {
                $like = '%' . addcslashes($term, '%_\\') . '%';
                $q->where(fn ($w) => $w->where('name', 'like', $like)->orWhere('phone', 'like', $like)->orWhere('email', 'like', $like)
                    ->orWhereHas('ownedVehicles', fn ($v) => $v->where('plate_number', 'like', $like)->orWhere('vin', 'like', $like)));
            })
            ->latest('id')->paginate(30)
            ->through(fn (User $u) => $u->only(['id', 'name', 'phone', 'email', 'is_active', 'preferred_branch']) + [
                'vehicles' => $u->owned_vehicles_count,
                'unpaid_invoices' => $u->unpaid_invoices_count,
                'since' => $u->created_at?->toDateString(),
            ]);
    }

    /** GET /admin/customers/{customer}: full CRM profile */
    public function show(int $customer)
    {
        $u = $this->customers()->with([
            'ownedVehicles',
            'jobCards' => fn ($q) => $q->latest()->limit(30)->with('customerVehicle:id,model,plate_number'),
            'invoices' => fn ($q) => $q->latest('issued_at')->limit(30),
            'orders' => fn ($q) => $q->latest()->limit(30),
            'appointments' => fn ($q) => $q->latest('starts_at')->limit(30),
        ])->findOrFail($customer);
        $locale = app()->getLocale();

        return $u->only(['id', 'name', 'phone', 'email', 'locale', 'preferred_branch', 'is_active', 'crm_notes']) + [
            'since' => $u->created_at?->toAtomString(),
            'vehicles' => $u->ownedVehicles,
            'job_cards' => $u->jobCards->map(fn ($c) => [
                'id' => $c->id, 'number' => $c->number, 'status' => $c->status->label($locale),
                'vehicle' => $c->customerVehicle?->model, 'created_at' => $c->created_at->toAtomString(),
            ]),
            'invoices' => $u->invoices->map(fn ($i) => [
                'id' => $i->id, 'number' => $i->number, 'status' => $i->status, 'currency' => $i->currency,
                'total' => (string) $i->total, 'balance' => $i->balance(), 'due_at' => $i->due_at?->toAtomString(),
            ]),
            'orders' => $u->orders->map(fn ($o) => [
                'number' => $o->number, 'flow' => $o->flow->value, 'status' => $o->status->value,
                'grand_total' => (string) $o->grand_total, 'currency' => $o->currency, 'placed_at' => $o->placed_at?->toAtomString(),
            ]),
            'appointments' => $u->appointments->map->toCustomerArray(),
        ];
    }

    /** POST /admin/customers: walk-in customer registered at the counter. */
    public function store(Request $request)
    {
        $data = $this->validated($request);
        $customer = User::create($data + ['password' => Str::password(24)]); // they set their own via password reset later
        if (! empty($data['crm_notes'])) {
            $customer->forceFill(['crm_notes' => $data['crm_notes']])->save();
        }

        return response()->json($customer->only(['id', 'name', 'phone', 'email']), 201);
    }

    public function update(Request $request, int $customer)
    {
        $u = $this->customers()->findOrFail($customer);
        $data = $this->validated($request, $u);
        $u->forceFill($data)->save();
        if (array_key_exists('is_active', $data) && ! $data['is_active']) {
            $u->tokens()->delete(); // log out everywhere
        }

        return $u->only(['id', 'name', 'phone', 'email', 'locale', 'preferred_branch', 'is_active', 'crm_notes']);
    }

    /** POST /admin/customers/{customer}/vehicles */
    public function storeVehicle(Request $request, int $customer)
    {
        $u = $this->customers()->findOrFail($customer);

        return response()->json($u->ownedVehicles()->create($this->vehicleRules($request)), 201);
    }

    /** PUT /admin/customer-vehicles/{vehicle} */
    public function updateVehicle(Request $request, CustomerVehicle $vehicle)
    {
        $vehicle->update($this->vehicleRules($request, $vehicle));

        return $vehicle->fresh();
    }

    /** Staff accounts are managed in StaffAdminController, never here. */
    private function customers()
    {
        return User::query()->whereDoesntHave('roles');
    }

    private function validated(Request $request, ?User $u = null): array
    {
        if ($request->filled('phone')) {
            $request->merge(['phone' => Phone::normalise($request->input('phone'))]);
        }

        return $request->validate([
            'name' => [$u ? 'sometimes' : 'required', 'string', 'max:120'],
            'phone' => [$u ? 'sometimes' : 'required', 'string', 'max:30', Rule::unique('users')->ignore($u?->id)],
            'email' => ['nullable', 'email', 'max:190', Rule::unique('users')->ignore($u?->id)],
            'locale' => ['nullable', 'in:ar,en'],
            'preferred_branch' => ['nullable', Rule::in(array_keys(config('awm.branches')))],
            'is_active' => ['nullable', 'boolean'],
            'crm_notes' => ['nullable', 'string', 'max:5000'],
        ]);
    }

    private function vehicleRules(Request $request, ?CustomerVehicle $v = null): array
    {
        return $request->validate([
            'vehicle_id' => ['nullable', 'exists:vehicles,id'],
            'vin' => ['nullable', 'string', 'size:17', Rule::unique('customer_vehicles')->ignore($v?->id)],
            'plate_number' => ['nullable', 'string', 'max:30'],
            'make' => ['nullable', 'string', 'max:40'],
            'model' => [$v ? 'sometimes' : 'required', 'string', 'max:60'],
            'model_year' => ['nullable', 'integer', 'between:1990,' . (now()->year + 1)],
            'color' => ['nullable', 'string', 'max:40'],
            'last_mileage_km' => ['nullable', 'integer', 'min:0'],
            'purchased_at' => ['nullable', 'date'],
            'warranty_until' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
    }
}
