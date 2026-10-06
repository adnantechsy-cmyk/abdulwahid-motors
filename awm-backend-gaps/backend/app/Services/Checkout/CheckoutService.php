<?php

namespace App\Services\Checkout;

use App\Contracts\Purchasable;
use App\Enums\OrderStatus;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckoutService
{
    /**
     * Turn a cart into ONE order per flow, re-pricing every line from the database.
     * All-or-nothing: if any line can't be fulfilled, nothing is created.
     *
     * @param  array{name:string, phone:string, email?:string}  $customer
     * @return Collection<int, Order>
     */
    public function placeOrders(Cart $cart, array $customer, ?array $shippingAddress = null, ?string $branch = null): Collection
    {
        return DB::transaction(function () use ($cart, $customer, $shippingAddress, $branch) {
            $cart = Cart::whereKey($cart->id)->lockForUpdate()->firstOrFail();

            if ($cart->status !== 'active') {
                throw new CheckoutException('Cart already checked out.', 'cart_closed');
            }

            $items = $cart->items()->get();
            if ($items->isEmpty()) {
                throw new CheckoutException('Cart is empty.', 'cart_empty');
            }

            $orders = $items->groupBy(fn ($i) => $i->flow->value)->map(
                fn (Collection $lines) => $this->createOrder($cart, $lines, $customer, $shippingAddress, $branch),
            )->values();

            $cart->update(['status' => 'converted']);

            return $orders;
        });
    }

    private function createOrder(Cart $cart, Collection $lines, array $customer, ?array $address, ?string $branch): Order
    {
        $order = Order::create([
            'number' => 'TMP-' . Str::random(24),        // fits number(32); replaced below once we have the id
            'user_id' => $cart->user_id,
            'cart_id' => $cart->id,
            'flow' => $lines->first()->flow,
            'status' => OrderStatus::Pending,
            'currency' => $cart->currency,
            'subtotal' => '0.00',
            'grand_total' => '0.00',
            'customer' => $customer,
            'shipping_address' => $lines->first()->flow->value === 'spare_part' ? $address : null,
            'branch_pickup' => $branch,
            'placed_at' => now(),
        ]);

        $subtotal = '0.00';

        foreach ($lines as $line) {
            // Lock the row so two checkouts can't both take the last unit.
            $class = Relation::getMorphedModel($line->purchasable_type);
            /** @var Purchasable|null $item */
            $item = $class ? $class::query()->lockForUpdate()->find($line->purchasable_id) : null;

            if (! $item instanceof Purchasable) {
                throw new CheckoutException('An item is no longer available.', 'item_missing');
            }
            if ($item->cartAvailableQuantity() < $line->quantity) {
                throw new CheckoutException('Insufficient stock or item unavailable.', 'unavailable');
            }
            if ($item->cartCurrency() !== $order->currency) {
                throw new CheckoutException('Currency changed, please refresh your cart.', 'currency_changed');
            }

            $unit = $item->cartUnitPrice();                       // authoritative price
            $total = bcmul($unit, (string) $line->quantity, 2);
            $subtotal = bcadd($subtotal, $total, 2);

            OrderItem::create([
                'order_id' => $order->id,
                'orderable_type' => $line->purchasable_type,
                'orderable_id' => $line->purchasable_id,
                'name' => $item->cartName(),
                'sku' => $item->cartSku(),
                'quantity' => $line->quantity,
                'unit_price' => $unit,
                'line_total' => $total,
                'snapshot' => $item->cartSnapshot(),
            ]);

            $item->onOrderPlaced($order, $line->quantity);        // hold stock / mark reserved
        }

        $order->update([
            'number' => Order::numberFor($order->id),
            'subtotal' => $subtotal,
            'grand_total' => $subtotal,                           // discounts/tax/shipping plug in here later
        ]);

        return $order;
    }

    /** Release held stock / reservations (admin cancel, expired unpaid order, ...). */
    public function cancel(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            if (! $order->status->isPayable()) {
                throw new CheckoutException('Only unpaid orders can be cancelled.', 'not_cancellable');
            }

            foreach ($order->items()->with('orderable')->get() as $line) {
                $line->orderable?->onOrderReleased($order, $line->quantity);
            }

            $order->update(['status' => OrderStatus::Cancelled]);
        });
    }
}
