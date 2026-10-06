<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\Appointments\AppointmentService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function __construct(private AppointmentService $appointments) {}

    /** GET /api/v1/appointments/slots?branch=sahnaya&date=2026-10-12 */
    public function slots(Request $request)
    {
        $data = $request->validate([
            'branch' => ['required', 'in:' . implode(',', array_keys(config('awm.branches')))],
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        return ['slots' => $this->appointments->slots($data['branch'], CarbonImmutable::parse($data['date'], config('app.timezone'))->startOfDay())];
    }

    /** POST /api/v1/appointments  (guests must give name + phone) */
    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'branch' => ['required', 'in:' . implode(',', array_keys(config('awm.branches')))],
            'service_type' => ['required', 'in:maintenance,repair,diagnostics,warranty,inspection,battery_check'],
            'starts_at' => ['required', 'date'],
            'customer_vehicle_id' => ['nullable', 'integer'],
            'vehicle_description' => ['nullable', 'string', 'max:120'],
            'contact_name' => [$user ? 'nullable' : 'required', 'string', 'max:120'],
            'contact_phone' => [$user ? 'nullable' : 'required', 'string', 'max:30'],
            'customer_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        return response()->json($this->appointments->book($data, $user)->toCustomerArray(), 201);
    }

    /** GET /api/v1/account/appointments */
    public function mine(Request $request)
    {
        return Appointment::where('user_id', $request->user()->id)->with('customerVehicle')
            ->orderByDesc('starts_at')->paginate(20)->through(fn ($a) => $a->toCustomerArray());
    }

    /** POST /api/v1/account/appointments/{number}/cancel */
    public function cancel(Request $request, string $number)
    {
        $a = Appointment::where('user_id', $request->user()->id)->where('number', $number)->firstOrFail();
        abort_unless($a->starts_at->isFuture(), 422, 'Past appointments cannot be cancelled.');

        return $this->appointments->cancel($a, $request->user())->toCustomerArray();
    }
}
