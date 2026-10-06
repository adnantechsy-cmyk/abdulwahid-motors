<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Cart extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['expires_at' => 'datetime'];

    protected static function booted(): void
    {
        static::creating(function (Cart $cart) {
            $cart->uuid ??= (string) Str::uuid();
            $cart->currency ??= config('awm.default_currency', 'USD');
            $cart->expires_at ??= now()->addDays(30);
        });
    }

    public function items(): HasMany { return $this->hasMany(CartItem::class); }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
