<?php

namespace App\Services\Appointments;

use App\Enums\AppointmentStatus;
use App\Enums\JobCardStatus;
use App\Models\Appointment;
use App\Models\JobCard;
use App\Models\User;
use App\Services\Checkout\CheckoutException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AppointmentService
{
    /**
     * Bookable slots for one branch and day.
     * @return array<int, array{starts_at:string, available:int}>
     */
    public function slots(string $branch, CarbonImmutable $date): array
    {
        $cfg = config('awm.appointments');
        $hours = $cfg['hours'][strtolower($date->englishDayOfWeek)] ?? null;
        if (! $hours || ! array_key_exists($branch, config('awm.branches'))) {
            return [];
        }

        $first = $date->setTimeFromTimeString($hours[0]);
        $close = $date->setTimeFromTimeString($hours[1]);
        $earliest = now()->addHours($cfg['min_lead_hours']);

        $taken = Appointment::occupying()->where('branch', $branch)
            ->whereBetween('starts_at', [$first, $close])
            ->selectRaw('starts_at, COUNT(*) as n')->groupBy('starts_at')
            ->pluck('n', 'starts_at')
            ->mapWithKeys(fn ($n, $ts) => [CarbonImmutable::parse($ts)->format('Y-m-d H:i') => (int) $n]);

        $slots = [];
        for ($t = $first; $t->lt($close); $t = $t->addMinutes($cfg['slot_minutes'])) {
            if ($t->lt($earliest)) {
                continue;
            }
            $slots[] = [
                'starts_at' => $t->toIso8601String(),
                'available' => max(0, $cfg['capacity_per_slot'] - ($taken[$t->format('Y-m-d H:i')] ?? 0)),
            ];
        }

        return $slots;
    }

    /** Capacity is enforced under a per-slot lock so two people can't take the last place. */
    public function book(array $data, ?User $user): Appointment
    {
        $start = CarbonImmutable::parse($data['starts_at'])->setTimezone(config('app.timezone'))->startOfMinute();
        $this->assertBookable($data['branch'], $start);

        if (! empty($data['customer_vehicle_id']) && (! $user || ! $user->ownedVehicles()->whereKey($data['customer_vehicle_id'])->exists())) {
            throw new CheckoutException('Vehicle not found in your account.', 'vehicle_not_owned');
        }

        $lock = Cache::lock("appointment-slot:{$data['branch']}:{$start->format('YmdHi')}", 10);

        return $lock->block(5, function () use ($data, $user, $start) {
            $taken = Appointment::occupying()->where('branch', $data['branch'])->where('starts_at', $start)->count();
            if ($taken >= config('awm.appointments.capacity_per_slot')) {
                throw new CheckoutException('This time is fully booked. Please pick another.', 'slot_full');
            }

            return Appointment::create([
                'user_id' => $user?->id,
                'customer_vehicle_id' => $data['customer_vehicle_id'] ?? null,
                'contact_name' => $data['contact_name'] ?? $user?->name,
                'contact_phone' => $data['contact_phone'] ?? $user?->phone,
                'vehicle_description' => $data['vehicle_description'] ?? null,
                'branch' => $data['branch'],
                'service_type' => $data['service_type'],
                'starts_at' => $start,
                'status' => AppointmentStatus::Requested,
                'customer_notes' => $data['customer_notes'] ?? null,
            ]);
        });
    }

    public function confirm(Appointment $a, User $staff): Appointment
    {
        $this->assertStatus($a, [AppointmentStatus::Requested]);
        $a->update(['status' => AppointmentStatus::Confirmed, 'confirmed_at' => now(), 'handled_by' => $staff->id]);

        return $a;
    }

    public function cancel(Appointment $a, ?User $by = null): Appointment
    {
        $this->assertStatus($a, [AppointmentStatus::Requested, AppointmentStatus::Confirmed]);
        $a->update(['status' => AppointmentStatus::Cancelled, 'cancelled_at' => now(), 'handled_by' => $by?->isStaff() ? $by->id : $a->handled_by]);

        return $a;
    }

    public function markNoShow(Appointment $a, User $staff): Appointment
    {
        $this->assertStatus($a, [AppointmentStatus::Confirmed]);
        $a->update(['status' => AppointmentStatus::NoShow, 'handled_by' => $staff->id]);

        return $a;
    }

    /** Customer arrived: open a job card (needs an account + a registered vehicle). */
    public function checkIn(Appointment $a, User $staff, ?int $technicianId = null): JobCard
    {
        $this->assertStatus($a, [AppointmentStatus::Requested, AppointmentStatus::Confirmed]);
        if (! $a->user_id || ! $a->customer_vehicle_id) {
            throw new CheckoutException('Link the appointment to a customer account and vehicle first.', 'appointment_unlinked');
        }

        return DB::transaction(function () use ($a, $staff, $technicianId) {
            $card = JobCard::create([
                'customer_id' => $a->user_id,
                'customer_vehicle_id' => $a->customer_vehicle_id,
                'technician_id' => $technicianId,
                'created_by' => $staff->id,
                'branch' => $a->branch,
                'status' => JobCardStatus::Pending,
                'service_type' => $a->service_type === 'battery_check' ? 'inspection' : $a->service_type,
                'complaint' => $a->customer_notes,
                'scheduled_at' => $a->starts_at,
            ]);

            $a->update(['status' => AppointmentStatus::Completed, 'job_card_id' => $card->id, 'handled_by' => $staff->id]);

            return $card;
        });
    }

    private function assertBookable(string $branch, CarbonImmutable $start): void
    {
        $cfg = config('awm.appointments');
        $valid = collect($this->slots($branch, $start->startOfDay()))
            ->contains(fn ($s) => CarbonImmutable::parse($s['starts_at'])->equalTo($start));

        if (! $valid || $start->gt(now()->addDays($cfg['max_days_ahead']))) {
            throw new CheckoutException('That time is not available for booking.', 'slot_invalid');
        }
    }

    private function assertStatus(Appointment $a, array $allowed): void
    {
        if (! in_array($a->status, $allowed, true)) {
            throw new CheckoutException('Appointment cannot be changed in its current state.', 'appointment_bad_state');
        }
    }
}
