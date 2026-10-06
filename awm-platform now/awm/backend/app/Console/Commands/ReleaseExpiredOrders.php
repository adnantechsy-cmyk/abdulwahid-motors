<?php

namespace App\Console\Commands;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Services\Checkout\CheckoutException;
use App\Services\Checkout\CheckoutService;
use Illuminate\Console\Command;

/**
 * Frees stock and reserved cars held by orders nobody paid for.
 * Orders with a payment waiting for staff confirmation (uploaded bank receipt) are never touched.
 */
class ReleaseExpiredOrders extends Command
{
    protected $signature = 'awm:release-expired-orders {--hours= : Unpaid age before release (default: the orders.unpaid_release_hours setting)}';

    protected $description = 'Cancel unpaid orders older than N hours and release held stock / reservations';

    public function handle(CheckoutService $checkout): int
    {
        $cutoff = now()->subHours((int) ($this->option('hours') ?: \App\Models\Setting::get('orders.unpaid_release_hours', 48)));
        $released = 0;

        Order::whereIn('status', [OrderStatus::Pending->value, OrderStatus::AwaitingPayment->value, OrderStatus::Failed->value])
            ->where('placed_at', '<', $cutoff)
            ->whereDoesntHave('payments', fn ($q) => $q->whereIn('status', [
                PaymentStatus::AwaitingConfirmation->value,
                PaymentStatus::RequiresAction->value,
                PaymentStatus::Captured->value,
            ]))
            ->chunkById(100, function ($orders) use ($checkout, &$released) {
                foreach ($orders as $order) {
                    try {
                        $checkout->cancel($order);
                        $released++;
                    } catch (CheckoutException) {
                        // State changed meanwhile (paid in the last second): leave it.
                    }
                }
            });

        $this->info("Released {$released} order(s).");

        return self::SUCCESS;
    }
}
