<?php

namespace App\Models;

use App\Enums\BatteryResult;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Translatable\HasTranslations;

class BatteryInspection extends Model
{
    use HasTranslations;

    public array $translatable = ['findings', 'recommendations'];

    protected $guarded = ['id'];

    protected $casts = [
        'result' => BatteryResult::class,
        'inspected_at' => 'datetime',
        'valid_until' => 'date',
        'readings' => 'array',
        'is_revoked' => 'boolean',
        'state_of_health_pct' => 'decimal:2',
        'state_of_charge_pct' => 'decimal:2',
        'pack_voltage_v' => 'decimal:2',
        'cell_voltage_min_v' => 'decimal:3',
        'cell_voltage_max_v' => 'decimal:3',
        'cell_temp_min_c' => 'decimal:2',
        'cell_temp_max_c' => 'decimal:2',
        'insulation_resistance_mohm' => 'decimal:2',
    ];

    public function customerVehicle(): BelongsTo { return $this->belongsTo(CustomerVehicle::class); }

    public function jobCard(): BelongsTo { return $this->belongsTo(JobCard::class); }

    public function technician(): BelongsTo { return $this->belongsTo(User::class, 'technician_id'); }

    public function isValid(): bool
    {
        return ! $this->is_revoked && ($this->valid_until === null || ! $this->valid_until->isPast());
    }

    public function verifyUrl(string $locale = 'ar'): string
    {
        return rtrim(config('awm.frontend_url'), '/') . "/{$locale}/certificates/{$this->verification_code}";
    }

    /** Report shape for the customer account and the public verification page. */
    public function toReportArray(string $locale, bool $public = false): array
    {
        $cv = $this->customerVehicle;

        return [
            'certificate_number' => $this->certificate_number,
            'verification_code' => $this->verification_code,
            'verify_url' => $this->verifyUrl($locale),
            'is_valid' => $this->isValid(),
            'is_revoked' => $this->is_revoked,
            'inspected_at' => $this->inspected_at->toAtomString(),
            'valid_until' => $this->valid_until?->toDateString(),
            'vehicle' => [
                'make' => $cv->make,
                'model' => $cv->model,
                'model_year' => $cv->model_year,
                // Public page shows only the last 6 VIN characters.
                'vin' => $public && $cv->vin ? '…' . substr($cv->vin, -6) : $cv->vin,
            ],
            'mileage_km' => $this->mileage_km,
            'result' => ['code' => $this->result->value, 'label' => $this->result->label($locale)],
            'state_of_health_pct' => (string) $this->state_of_health_pct,
            'state_of_charge_pct' => $this->state_of_charge_pct !== null ? (string) $this->state_of_charge_pct : null,
            'pack_voltage_v' => $this->pack_voltage_v !== null ? (string) $this->pack_voltage_v : null,
            'cell_voltage_v' => ['min' => $this->cell_voltage_min_v, 'max' => $this->cell_voltage_max_v],
            'cell_temp_c' => ['min' => $this->cell_temp_min_c, 'max' => $this->cell_temp_max_c],
            'insulation_resistance_mohm' => $this->insulation_resistance_mohm,
            'charge_cycles' => $this->charge_cycles,
            'findings' => $this->getTranslation('findings', $locale) ?: null,
            'recommendations' => $this->getTranslation('recommendations', $locale) ?: null,
            'technician' => $public ? null : $this->technician?->name,
        ];
    }
}
