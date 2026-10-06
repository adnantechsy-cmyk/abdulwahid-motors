<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** CRM: a car owned by a customer. Service history = its job cards. */
class CustomerVehicle extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'purchased_at' => 'date',
        'warranty_until' => 'date',
        'last_mileage_km' => 'integer',
    ];

    public function owner(): BelongsTo { return $this->belongsTo(User::class, 'user_id'); }

    public function vehicle(): BelongsTo { return $this->belongsTo(Vehicle::class)->withTrashed(); }

    public function jobCards(): HasMany { return $this->hasMany(JobCard::class); }

    public function batteryInspections(): HasMany { return $this->hasMany(BatteryInspection::class)->latest('inspected_at'); }

    public function appointments(): HasMany { return $this->hasMany(Appointment::class); }

    public function isUnderWarranty(): bool
    {
        return $this->warranty_until !== null && $this->warranty_until->isFuture();
    }
}
