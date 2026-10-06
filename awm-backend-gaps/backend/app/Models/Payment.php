<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Payment extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'status' => PaymentStatus::class,
        'amount' => 'decimal:2',
        'refunded_amount' => 'decimal:2',
        'payload' => 'array',
        'confirmed_at' => 'datetime',
        'captured_at' => 'datetime',
    ];

    protected $hidden = ['payload', 'proof_path'];

    protected static function booted(): void
    {
        static::creating(fn (Payment $p) => $p->uuid ??= (string) Str::uuid());
    }

    public function order(): BelongsTo { return $this->belongsTo(Order::class); }

    public function gateway(): BelongsTo { return $this->belongsTo(PaymentGateway::class, 'payment_gateway_id'); }

    public function confirmer(): BelongsTo { return $this->belongsTo(User::class, 'confirmed_by'); }

    public function events(): HasMany { return $this->hasMany(PaymentEvent::class); }
}
