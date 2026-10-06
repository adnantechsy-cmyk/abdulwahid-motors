<?php

namespace App\Services\Inventory;

use App\Enums\JobCardStatus;
use App\Models\JobCard;
use App\Models\JobCardPart;
use App\Models\MaintenanceInvoice;
use App\Models\SparePart;
use Illuminate\Support\Facades\DB;

class JobCardService
{
    public function __construct(private StockService $stock) {}

    /**
     * Technician uses a part on a job: stock is deducted automatically, atomically.
     * If stock is short the card moves to WAITING_PARTS and the exception is rethrown
     * so the UI can tell the technician.
     */
    public function usePart(JobCard $card, SparePart $part, int $quantity, ?int $userId = null): JobCardPart
    {
        if ($card->status === JobCardStatus::Completed) {
            throw new \App\Services\Checkout\CheckoutException('Job card is completed.', 'job_card_closed');
        }

        try {
            return DB::transaction(function () use ($card, $part, $quantity, $userId) {
                // Parts held by unpaid web orders are not available to the workshop either.
                $fresh = SparePart::whereKey($part->id)->lockForUpdate()->firstOrFail();
                if ($fresh->availableQuantity() < $quantity) {
                    throw new InsufficientStockException("Not enough stock for {$fresh->sku}.");
                }

                $this->stock->move($fresh, -$quantity, 'maintenance_usage', $card, $userId);

                if ($card->status === JobCardStatus::Pending || $card->status === JobCardStatus::WaitingParts) {
                    $card->update(['status' => JobCardStatus::InProgress]);
                }

                return JobCardPart::create([
                    'job_card_id' => $card->id,
                    'spare_part_id' => $fresh->id,
                    'quantity' => $quantity,
                    'unit_price' => $fresh->price,
                ]);
            });
        } catch (InsufficientStockException $e) {
            $card->update(['status' => JobCardStatus::WaitingParts]); // outside the rolled-back transaction
            throw $e;
        }
    }

    /** Close the job and issue the invoice the customer can pay online. */
    /** Undo a part line (wrong part, not fitted): stock goes back, audited as a return. */
    public function returnPart(JobCardPart $line, ?int $userId = null): void
    {
        DB::transaction(function () use ($line, $userId) {
            $line = JobCardPart::whereKey($line->id)->lockForUpdate()->firstOrFail();
            $card = $line->jobCard;
            if ($card->status === JobCardStatus::Completed) {
                throw new \App\Services\Checkout\CheckoutException('Job card is completed.', 'job_card_closed');
            }
            $this->stock->move($line->part, $line->quantity, 'return', $card, $userId, 'Returned from job card');
            $line->delete();
        });
    }

    public function complete(JobCard $card, string $laborTotal, string $currency = 'USD'): MaintenanceInvoice
    {
        if ($card->status === JobCardStatus::Completed || $card->invoice()->exists()) {
            throw new \App\Services\Checkout\CheckoutException('Job card is already completed.', 'job_card_closed');
        }

        return DB::transaction(function () use ($card, $laborTotal, $currency) {
            $partsTotal = $card->parts()->get()
                ->reduce(fn ($sum, $p) => bcadd($sum, bcmul((string) $p->unit_price, (string) $p->quantity, 2), 2), '0.00');

            $card->update(['status' => JobCardStatus::Completed, 'completed_at' => now()]);

            $invoice = MaintenanceInvoice::create([
                'number' => 'TMP-' . uniqid(),
                'job_card_id' => $card->id,
                'user_id' => $card->customer_id,
                'currency' => $currency,
                'parts_total' => $partsTotal,
                'labor_total' => $laborTotal,
                'total' => bcadd($partsTotal, $laborTotal, 2),
                'status' => 'unpaid',
                'issued_at' => now(),
                'due_at' => now()->addDays((int) \App\Models\Setting::get('billing.invoice_due_days', 14)),
            ]);
            $invoice->update(['number' => MaintenanceInvoice::numberFor($invoice->id)]);

            return $invoice;
        });
    }
}
