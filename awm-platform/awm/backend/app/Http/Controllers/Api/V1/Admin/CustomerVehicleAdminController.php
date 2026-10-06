<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomerVehicle;
use Illuminate\Http\Request;

/** Lookup of customers' cars (owner, plate, VIN), used when issuing a battery certificate or linking a booking. */
class CustomerVehicleAdminController extends Controller
{
    /** GET /admin/customer-vehicles?q=  (owner name or phone, plate, VIN, model) */
    public function index(Request $request)
    {
        $data = $request->validate(['q' => ['nullable', 'string', 'max:60']]);
        $q = $data['q'] ?? null;

        return CustomerVehicle::with('owner:id,name,phone')
            ->when($q, fn ($query) => $query->where(fn ($w) => $w
                ->where('plate_number', 'like', "%{$q}%")
                ->orWhere('vin', 'like', "%{$q}%")
                ->orWhere('model', 'like', "%{$q}%")
                ->orWhereHas('owner', fn ($o) => $o->where('name', 'like', "%{$q}%")->orWhere('phone', 'like', "%{$q}%"))))
            ->latest('id')
            ->paginate(10)
            ->through(fn (CustomerVehicle $v) => [
                'id' => $v->id,
                'make' => $v->make,
                'model' => $v->model,
                'model_year' => $v->model_year,
                'vin' => $v->vin,
                'plate_number' => $v->plate_number,
                'last_mileage_km' => $v->last_mileage_km,
                'owner' => $v->owner ? ['id' => $v->owner->id, 'name' => $v->owner->name, 'phone' => $v->owner->phone] : null,
            ]);
    }

    /** GET /admin/customer-vehicles/{vehicle} */
    public function show(CustomerVehicle $vehicle)
    {
        $vehicle->load('owner:id,name,phone');

        return [
            'id' => $vehicle->id,
            'make' => $vehicle->make,
            'model' => $vehicle->model,
            'model_year' => $vehicle->model_year,
            'vin' => $vehicle->vin,
            'plate_number' => $vehicle->plate_number,
            'last_mileage_km' => $vehicle->last_mileage_km,
            'owner' => $vehicle->owner ? ['id' => $vehicle->owner->id, 'name' => $vehicle->owner->name, 'phone' => $vehicle->owner->phone] : null,
        ];
    }
}