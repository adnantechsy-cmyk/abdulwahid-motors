<?php

namespace App\Services\Inventory;

use App\Models\SparePart;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class StockService
{
    /**
     * The ONLY place that changes stock_quantity. Locks the row, refuses to go negative,
     * and writes an audit row.
     */
    public function move(SparePart $part, int $delta, string $type, ?Model $reference = null, ?int $userId = null, ?string $note = null): StockMovement
    {
        return DB::transaction(function () use ($part, $delta, $type, $reference, $userId, $note) {
            $locked = SparePart::whereKey($part->id)->lockForUpdate()->firstOrFail();
            $balance = $locked->stock_quantity + $delta;

            if ($balance < 0) {
                throw new InsufficientStockException("Not enough stock for {$locked->sku}.");
            }

            $locked->update(['stock_quantity' => $balance]);
            $part->stock_quantity = $balance; // keep the caller's instance current

            return StockMovement::create([
                'spare_part_id' => $locked->id,
                'type' => $type,
                'quantity_change' => $delta,
                'balance_after' => $balance,
                'reference_type' => $reference ? $reference->getMorphClass() : null,
                'reference_id' => $reference?->getKey(),
                'user_id' => $userId,
                'note' => $note,
            ]);
        });
    }
}
