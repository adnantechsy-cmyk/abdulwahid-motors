<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobCardPart extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['quantity' => 'integer', 'unit_price' => 'decimal:2'];

    public function jobCard(): BelongsTo { return $this->belongsTo(JobCard::class); }

    public function part(): BelongsTo { return $this->belongsTo(SparePart::class, 'spare_part_id')->withTrashed(); }
}
