<?php

namespace App\Models;

use App\Contracts\Purchasable;
use App\Enums\CartFlow;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceInvoice extends Model implements Purchasable
{
    protected $guarded = ['id'];

    protected $casts = [
        'parts_total' => 'decimal:2',
        'labor_total' => 'decimal:2',
        'total' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'issued_at' => 'datetime',
        'due_at' => 'datetime',
    ];

    public function jobCard(): BelongsTo { return $this->belongsTo(JobCard::class); }

    public function customer(): BelongsTo { return $this->belongsTo(User::class, 'user_id'); }

    public function balance(): string
    {
        return bcsub((string) $this->total, (string) $this->paid_amount, 2);
    }

    public static function numberFor(int $id): string
    {
        return sprintf('INV-%s-%06d', now()->format('Y'), $id);
    }

    /* ---------- Purchasable: pay a service bill ---------- */

    public function cartFlow(): CartFlow { return CartFlow::MaintenanceInvoice; }

    public function cartUnitPrice(): string { return $this->balance(); }

    public function cartCurrency(): string { return $this->currency; }

    public function cartName(): array
    {
        return ['ar' => "فاتورة صيانة {$this->number}", 'en' => "Service invoice {$this->number}"];
    }

    public function cartSku(): ?string { return $this->number; }

    public function cartAvailableQuantity(): int
    {
        return in_array($this->status, ['unpaid', 'partially_paid'], true) && bccomp($this->balance(), '0', 2) > 0 ? 1 : 0;
    }

    public function cartSnapshot(): array
    {
        return ['invoice_number' => $this->number, 'total' => (string) $this->total];
    }

    public function onOrderPlaced(Order $order, int $quantity): void {}

    /** The order total for this line is what the customer paid toward the invoice. */
    public function onOrderPaid(Order $order, int $quantity): void
    {
        $paid = min((string) $this->total, bcadd((string) $this->paid_amount, $this->balance(), 2));
        $this->update([
            'paid_amount' => $paid,
            'status' => bccomp($paid, (string) $this->total, 2) >= 0 ? 'paid' : 'partially_paid',
        ]);
    }

    public function onOrderReleased(Order $order, int $quantity): void {}
}
