<?php

namespace App\Models;

use App\Contracts\Purchasable;
use App\Enums\CartFlow;
use Illuminate\Database\Eloquent\Model;
use App\Services\Checkout\CheckoutException;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

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

    public function payments(): HasMany { return $this->hasMany(InvoicePayment::class)->latest('received_at'); }

    /**
     * The only place paid_amount changes. Logs the payment and moves the status.
     * Online payments are recorded in full even if the counter collected meanwhile
     * (the money was taken); a negative balance then shows a credit to refund.
     */
    public function recordPayment(string $amount, string $method, ?string $reference = null, ?int $receivedBy = null, ?string $note = null): InvoicePayment
    {
        if (bccomp($amount, '0', 2) <= 0) {
            throw new CheckoutException('Amount must be positive.', 'invalid_amount');
        }

        return DB::transaction(function () use ($amount, $method, $reference, $receivedBy, $note) {
            $invoice = static::whereKey($this->id)->lockForUpdate()->firstOrFail();
            if ($invoice->status === 'void') {
                throw new CheckoutException('Invoice is void.', 'invoice_void');
            }

            $payment = InvoicePayment::create([
                'maintenance_invoice_id' => $invoice->id,
                'amount' => $amount,
                'currency' => $invoice->currency,
                'method' => $method,
                'reference' => $reference,
                'received_by' => $receivedBy,
                'received_at' => now(),
                'note' => $note,
            ]);

            $paid = bcadd((string) $invoice->paid_amount, $amount, 2);
            $invoice->update([
                'paid_amount' => $paid,
                'status' => bccomp($paid, (string) $invoice->total, 2) >= 0 ? 'paid' : 'partially_paid',
            ]);
            $this->setRawAttributes($invoice->getAttributes(), true);

            return $payment;
        });
    }

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
    /** Records exactly what this order line charged (not "whatever the balance is now"). */
    public function onOrderPaid(Order $order, int $quantity): void
    {
        $line = $order->items()
            ->where('orderable_type', $this->getMorphClass())
            ->where('orderable_id', $this->id)
            ->first();

        $this->recordPayment($line ? (string) $line->line_total : $this->balance(), 'online', $order->number);
    }

    public function onOrderReleased(Order $order, int $quantity): void {}
}
