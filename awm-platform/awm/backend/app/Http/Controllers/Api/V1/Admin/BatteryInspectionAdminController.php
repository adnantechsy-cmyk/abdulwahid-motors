<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\BatteryInspection;
use App\Models\CustomerVehicle;
use App\Services\Battery\BatteryCertificateService;
use Illuminate\Http\Request;

class BatteryInspectionAdminController extends Controller
{
    public function __construct(private BatteryCertificateService $certificates) {}

    /** GET /admin/battery-inspections?customer_vehicle_id= */
    public function index(Request $request)
    {
        return BatteryInspection::with(['customerVehicle.owner:id,name,phone', 'technician:id,name'])
            ->when($request->query('customer_vehicle_id'), fn ($q, $id) => $q->where('customer_vehicle_id', $id))
            ->when($request->query('result'), fn ($q, $r) => $q->where('result', $r))
            ->latest('inspected_at')->paginate(25)
            ->through(fn (BatteryInspection $r) => $r->toReportArray(app()->getLocale()) + [
                'id' => $r->id,
                'owner' => $r->customerVehicle->owner?->only(['id', 'name', 'phone']),
            ]);
    }

    /** POST /admin/customer-vehicles/{vehicle}/battery-inspections */
    public function store(Request $request, CustomerVehicle $vehicle)
    {
        $pct = ['nullable', 'numeric', 'between:0,100'];
        $data = $request->validate([
            'job_card_id' => ['nullable', 'exists:job_cards,id'],
            'inspected_at' => ['nullable', 'date', 'before_or_equal:now'],
            'mileage_km' => ['nullable', 'integer', 'min:0'],
            'state_of_health_pct' => ['required', 'numeric', 'between:0,100'],
            'state_of_charge_pct' => $pct,
            'pack_voltage_v' => ['nullable', 'numeric', 'min:0'],
            'cell_voltage_min_v' => ['nullable', 'numeric', 'between:0,5'],
            'cell_voltage_max_v' => ['nullable', 'numeric', 'between:0,5', 'gte:cell_voltage_min_v'],
            'cell_temp_min_c' => ['nullable', 'numeric', 'between:-40,100'],
            'cell_temp_max_c' => ['nullable', 'numeric', 'between:-40,100', 'gte:cell_temp_min_c'],
            'insulation_resistance_mohm' => ['nullable', 'numeric', 'min:0'],
            'charge_cycles' => ['nullable', 'integer', 'min:0'],
            'readings' => ['nullable', 'array'],
            'result' => ['nullable', 'in:pass,attention,fail'],
            'findings' => ['nullable', 'array'],
            'findings.*' => ['nullable', 'string', 'max:2000'],
            'recommendations' => ['nullable', 'array'],
            'recommendations.*' => ['nullable', 'string', 'max:2000'],
        ]);

        $report = $this->certificates->issue($vehicle, $data, $request->user());

        return response()->json($report->load('customerVehicle', 'technician')->toReportArray(app()->getLocale()), 201);
    }

    /** POST /admin/battery-inspections/{report}/revoke */
    public function revoke(BatteryInspection $report)
    {
        return $this->certificates->revoke($report)->load('customerVehicle')->toReportArray(app()->getLocale());
    }
}
