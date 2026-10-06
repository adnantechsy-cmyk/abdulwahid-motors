<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Translatable\HasTranslations;

class PdiChecklistItem extends Model
{
    use HasTranslations;

    public array $translatable = ['label'];

    protected $guarded = ['id'];

    protected $casts = ['checked_at' => 'datetime'];

    public function inspection(): BelongsTo { return $this->belongsTo(PdiInspection::class, 'pdi_inspection_id'); }

    public function checker(): BelongsTo { return $this->belongsTo(User::class, 'checked_by'); }
}
