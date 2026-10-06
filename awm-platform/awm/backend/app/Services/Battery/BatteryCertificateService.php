<?php

namespace App\Services\Battery;

use App\Enums\BatteryResult;
use App\Models\BatteryInspection;
use App\Models\CustomerVehicle;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BatteryCertificateService
{
    public function issue(CustomerVehicle $vehicle, array $data, User $technician): BatteryInspection
    {
        return DB::transaction(function () use ($vehicle, $data, $technician) {
            $inspectedAt = CarbonImmutable::parse($data['inspected_at'] ?? now());
            $result = isset($data['result'])
                ? BatteryResult::from($data['result'])
                : BatteryResult::fromStateOfHealth((float) $data['state_of_health_pct']);

            $report = BatteryInspection::create([
                'certificate_number' => 'TMP-' . Str::random(24),
                'verification_code' => $this->uniqueCode(),
                'customer_vehicle_id' => $vehicle->id,
                'job_card_id' => $data['job_card_id'] ?? null,
                'technician_id' => $technician->id,
                'inspected_at' => $inspectedAt,
                'result' => $result,
                // A failed battery gets no validity period: the certificate only documents the finding.
                'valid_until' => $result === BatteryResult::Fail ? null
                    : $inspectedAt->addMonths((int) config('awm.battery.validity_months', 6))->toDateString(),
            ] + collect($data)->only([
                'mileage_km', 'state_of_health_pct', 'state_of_charge_pct', 'pack_voltage_v',
                'cell_voltage_min_v', 'cell_voltage_max_v', 'cell_temp_min_c', 'cell_temp_max_c',
                'insulation_resistance_mohm', 'charge_cycles', 'readings', 'findings', 'recommendations',
            ])->all());

            $report->update(['certificate_number' => sprintf('BAT-%s-%06d', $inspectedAt->format('Y'), $report->id)]);

            if (! empty($data['mileage_km']) && $data['mileage_km'] > (int) $vehicle->last_mileage_km) {
                $vehicle->update(['last_mileage_km' => $data['mileage_km']]);
            }

            return $report;
        });
    }

    public function revoke(BatteryInspection $report): BatteryInspection
    {
        $report->update(['is_revoked' => true]);

        return $report;
    }

    /** 12 chars, no look-alikes (0/O, 1/I), easy to type from a printed certificate. */
    private function uniqueCode(): string
    {
        do {
            $code = collect(range(1, 12))->map(fn () => '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[random_int(0, 31)])->implode('');
        } while (BatteryInspection::where('verification_code', $code)->exists());

        return $code;
    }
}
