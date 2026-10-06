<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentEvent extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['payload' => 'array', 'processed_at' => 'datetime'];

    public function payment(): BelongsTo { return $this->belongsTo(Payment::class); }
}
