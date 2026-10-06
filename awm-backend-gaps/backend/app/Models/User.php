<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

/**
 * Customers and staff. Staff have one of the roles admin | sales | technician | inventory;
 * customers have no role.
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected $fillable = ['name', 'email', 'phone', 'password', 'locale', 'preferred_branch'];

    protected $hidden = ['password', 'remember_token', 'crm_notes'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function isStaff(): bool
    {
        return $this->roles()->exists();
    }

    /* ---------- CRM ---------- */

    public function ownedVehicles(): HasMany { return $this->hasMany(CustomerVehicle::class); }

    public function jobCards(): HasMany { return $this->hasMany(JobCard::class, 'customer_id'); }

    public function invoices(): HasMany { return $this->hasMany(MaintenanceInvoice::class); }

    public function orders(): HasMany { return $this->hasMany(Order::class); }

    /** Technician view: cards assigned to me. */
    public function assignedJobCards(): HasMany { return $this->hasMany(JobCard::class, 'technician_id'); }
}
