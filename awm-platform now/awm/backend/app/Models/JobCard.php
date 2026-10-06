<?php

namespace App\Models;

use App\Enums\JobCardStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class JobCard extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'status' => JobCardStatus::class,
        'scheduled_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'mileage_in_km' => 'integer',
    ];

    protected static function booted(): void
    {
        // Temporary unique number, replaced with JC-YYYY-000123 once the id exists.
        static::creating(fn (JobCard $c) => $c->number ??= 'TMP-' . Str::random(24));
        static::created(fn (JobCard $c) => $c->updateQuietly(['number' => sprintf('JC-%s-%06d', now()->format('Y'), $c->id)]));

        static::updating(function (JobCard $c) {
            if ($c->isDirty('status') && $c->status === JobCardStatus::InProgress && $c->started_at === null) {
                $c->started_at = now();
            }
        });
    }

    public function customer(): BelongsTo { return $this->belongsTo(User::class, 'customer_id'); }

    public function customerVehicle(): BelongsTo { return $this->belongsTo(CustomerVehicle::class); }

    public function technician(): BelongsTo { return $this->belongsTo(User::class, 'technician_id'); }

    public function parts(): HasMany { return $this->hasMany(JobCardPart::class); }

    public function invoice(): HasOne { return $this->hasOne(MaintenanceInvoice::class); }

    /** Dashboard "pending maintenance" counter. */
    public function scopeOpen(Builder $q): Builder
    {
        return $q->where('status', '!=', JobCardStatus::Completed->value);
    }
}
