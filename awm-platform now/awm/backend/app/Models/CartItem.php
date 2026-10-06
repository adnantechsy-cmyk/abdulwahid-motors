<?php

namespace App\Models;

use App\Enums\CartFlow;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class CartItem extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'flow' => CartFlow::class,
        'unit_price' => 'decimal:2',
        'snapshot' => 'array',
    ];

    public function cart(): BelongsTo { return $this->belongsTo(Cart::class); }

    /** SparePart | Vehicle | MaintenanceInvoice (morph aliases in AppServiceProvider). */
    public function purchasable(): MorphTo { return $this->morphTo(); }
}
