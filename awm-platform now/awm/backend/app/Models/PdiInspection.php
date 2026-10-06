<?php

namespace App\Models;

use App\Enums\PdiStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Translatable\HasTranslations;

class PdiInspection extends Model
{
    use HasTranslations;

    public array $translatable = ['customer_note'];

    protected $guarded = ['id'];

    protected $casts = [
        'status' => PdiStatus::class,
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'estimated_delivery_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    public function order(): BelongsTo { return $this->belongsTo(Order::class); }

    public function vehicle(): BelongsTo { return $this->belongsTo(Vehicle::class)->withTrashed(); }

    public function technician(): BelongsTo { return $this->belongsTo(User::class, 'technician_id'); }

    public function items(): HasMany { return $this->hasMany(PdiChecklistItem::class)->orderBy('sort_order'); }

    /** {total, done, failed, percent} for progress bars. */
    public function progress(): array
    {
        $items = $this->relationLoaded('items') ? $this->items : $this->items()->get();
        $total = $items->count();
        $done = $items->where('status', '!=', 'pending')->count();

        return [
            'total' => $total,
            'done' => $done,
            'failed' => $items->where('status', 'fail')->count(),
            'percent' => $total ? (int) floor($done * 100 / $total) : 0,
        ];
    }
}
