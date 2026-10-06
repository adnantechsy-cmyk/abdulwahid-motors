<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/** Append-only audit log. Written exclusively by StockService::move(). */
class StockMovement extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['quantity_change' => 'integer', 'balance_after' => 'integer'];

    public function part(): BelongsTo { return $this->belongsTo(SparePart::class, 'spare_part_id')->withTrashed(); }

    public function reference(): MorphTo { return $this->morphTo(); }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
