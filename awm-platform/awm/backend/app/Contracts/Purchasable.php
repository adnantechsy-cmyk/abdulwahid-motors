<?php

namespace App\Contracts;

use App\Enums\CartFlow;

/**
 * Implemented by SparePart, Vehicle and MaintenanceInvoice.
 * The cart never trusts client prices: it always asks the model.
 */
interface Purchasable
{
    public function cartFlow(): CartFlow;

    /** Price per unit RIGHT NOW. Vehicle => deposit amount. Invoice => outstanding balance. */
    public function cartUnitPrice(): string;

    public function cartCurrency(): string;

    /** @return array{ar:string,en:string} */
    public function cartName(): array;

    public function cartSku(): ?string;

    /** Max units that can be bought now (parts: stock; others: 1 or 0). */
    public function cartAvailableQuantity(): int;

    /** Extra display data stored on the line (image, full vehicle price, invoice number...). */
    public function cartSnapshot(): array;

    /**
     * Called inside the checkout transaction, after the order exists.
     * Parts: lock + decrement/hold stock. Vehicle: set status "reserved". Invoice: no-op.
     * Must throw App\Services\Checkout\CheckoutException if it can no longer be fulfilled.
     */
    public function onOrderPlaced(\App\Models\Order $order, int $quantity): void;

    /** Called once the order is paid. Invoice: record payment. Vehicle: confirm reservation. */
    public function onOrderPaid(\App\Models\Order $order, int $quantity): void;

    /** Called when the order is cancelled/failed so held stock or reservations are released. */
    public function onOrderReleased(\App\Models\Order $order, int $quantity): void;
}
