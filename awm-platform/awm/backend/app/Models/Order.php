<?php

namespace App\Models;

use App\Enums\CartFlow;
use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'flow' => CartFlow::class,
        'status' => OrderStatus::class,
        'subtotal' => 'decimal:2',
        'discount_total' => 'decimal:2',
        'tax_total' => 'decimal:2',
        'shipping_total' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'customer' => 'array',
        'shipping_address' => 'array',
        'placed_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public static function numberFor(int $id): string
    {
        return sprintf('AWM-%s-%06d', now()->format('Y'), $id);
    }

    public function items(): HasMany { return $this->hasMany(OrderItem::class); }

    public function payments(): HasMany { return $this->hasMany(Payment::class); }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }

    public function cart(): BelongsTo { return $this->belongsTo(Cart::class); }

    /** Only vehicle_reservation orders get one. */
    public function pdi(): HasOne { return $this->hasOne(PdiInspection::class); }
}
