<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class OrderItem extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'name' => 'array',          // frozen {ar, en}: deliberately NOT translatable, it must never change
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
        'snapshot' => 'array',
    ];

    public function order(): BelongsTo { return $this->belongsTo(Order::class); }

    /**
     * SparePart | Vehicle | MaintenanceInvoice. Display data is frozen in name/snapshot,
     * so a later soft-delete of the car or part never breaks order history.
     */
    public function orderable(): MorphTo { return $this->morphTo(); }
}
