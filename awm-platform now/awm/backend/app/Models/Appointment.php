<?php

namespace App\Models;

use App\Enums\AppointmentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Appointment extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'status' => AppointmentStatus::class,
        'starts_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(fn (Appointment $a) => $a->number ??= 'TMP-' . Str::random(24));
        static::created(fn (Appointment $a) => $a->updateQuietly(['number' => sprintf('APT-%s-%06d', now()->format('Y'), $a->id)]));
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }

    public function customerVehicle(): BelongsTo { return $this->belongsTo(CustomerVehicle::class); }

    public function jobCard(): BelongsTo { return $this->belongsTo(JobCard::class); }

    public function handler(): BelongsTo { return $this->belongsTo(User::class, 'handled_by'); }

    public function scopeOccupying(Builder $q): Builder
    {
        return $q->whereIn('status', [AppointmentStatus::Requested->value, AppointmentStatus::Confirmed->value]);
    }

    public function toCustomerArray(): array
    {
        return [
            'number' => $this->number,
            'branch' => $this->branch,
            'service_type' => $this->service_type,
            'starts_at' => $this->starts_at->toIso8601String(),
            'status' => $this->status->value,
            'vehicle' => $this->customerVehicle
                ? trim("{$this->customerVehicle->make} {$this->customerVehicle->model} {$this->customerVehicle->model_year}")
                : $this->vehicle_description,
            'customer_notes' => $this->customer_notes,
            'can_cancel' => $this->status->occupiesSlot() && $this->starts_at->isFuture(),
        ];
    }
}
