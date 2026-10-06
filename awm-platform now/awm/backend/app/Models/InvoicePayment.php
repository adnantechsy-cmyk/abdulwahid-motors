<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoicePayment extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['amount' => 'decimal:2', 'received_at' => 'datetime'];

    public function invoice(): BelongsTo { return $this->belongsTo(MaintenanceInvoice::class, 'maintenance_invoice_id'); }

    public function receiver(): BelongsTo { return $this->belongsTo(User::class, 'received_by'); }
}
