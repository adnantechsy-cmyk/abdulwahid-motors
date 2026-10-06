<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\Appointments\AppointmentService;
use Illuminate\Http\Request;

class AppointmentAdminController extends Controller
{
    public function __construct(private AppointmentService $appointments) {}

    /** GET /admin/appointments?date=2026-10-12&branch=sahnaya&status=requested */
    public function index(Request $request)
    {
        $data = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
            'branch' => ['nullable', 'string'],
            'status' => ['nullable', 'in:requested,confirmed,cancelled,completed,no_show'],
        ]);

        return Appointment::with(['user:id,name,phone', 'customerVehicle', 'handler:id,name'])
            ->when($data['date'] ?? null, fn ($q, $d) => $q->whereDate('starts_at', $d))
            ->when($data['branch'] ?? null, fn ($q, $b) => $q->where('branch', $b))
            ->when($data['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->orderBy('starts_at')->paginate(50)
            ->through(fn (Appointment $a) => $a->toCustomerArray() + [
                'id' => $a->id,
                'contact_name' => $a->contact_name,
                'contact_phone' => $a->contact_phone,
                'user_id' => $a->user_id,
                'customer_vehicle_id' => $a->customer_vehicle_id,
                'staff_notes' => $a->staff_notes,
                'handled_by' => $a->handler?->name,
                'job_card_id' => $a->job_card_id,
            ]);
    }

    /** PUT /admin/appointments/{appointment}  link to a customer/vehicle, staff notes */
    public function update(Request $request, Appointment $appointment)
    {
        $data = $request->validate([
            'user_id' => ['nullable', 'exists:users,id'],
            'customer_vehicle_id' => ['nullable', 'exists:customer_vehicles,id'],
            'staff_notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $userId = array_key_exists('user_id', $data) ? $data['user_id'] : $appointment->user_id;
        if (! empty($data['customer_vehicle_id'])) {
            abort_unless(
                \App\Models\CustomerVehicle::whereKey($data['customer_vehicle_id'])->where('user_id', $userId)->exists(),
                422, 'That vehicle does not belong to this customer.',
            );
        }
        $appointment->update($data);

        return $appointment->fresh()->toCustomerArray();
    }

    public function confirm(Request $request, Appointment $appointment)
    {
        return $this->appointments->confirm($appointment, $request->user())->toCustomerArray();
    }

    public function cancel(Request $request, Appointment $appointment)
    {
        return $this->appointments->cancel($appointment, $request->user())->toCustomerArray();
    }

    public function noShow(Request $request, Appointment $appointment)
    {
        return $this->appointments->markNoShow($appointment, $request->user())->toCustomerArray();
    }

    /** POST /admin/appointments/{appointment}/check-in  {technician_id?} -> creates the job card */
    public function checkIn(Request $request, Appointment $appointment)
    {
        $data = $request->validate(['technician_id' => ['nullable', 'exists:users,id']]);
        $card = $this->appointments->checkIn($appointment, $request->user(), $data['technician_id'] ?? null);

        return response()->json(['job_card_number' => $card->number, 'job_card_id' => $card->id], 201);
    }
}
