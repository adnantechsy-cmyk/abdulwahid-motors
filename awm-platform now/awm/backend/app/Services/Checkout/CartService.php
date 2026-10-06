<?php

namespace App\Services\Checkout;

use App\Contracts\Purchasable;
use App\Models\Cart;
use App\Models\CartItem;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\DB;

class CartService
{
    /**
     * Replace the server cart with what the browser holds (PUT /cart).
     * Prices and names come from the database; client values are ignored.
     * Lines that can't be bought any more are dropped and reported back.
     *
     * @param  array<int, array{type:string, id:int, quantity?:int}>  $lines  type = morph alias
     * @return array{cart: Cart, dropped: array<int, array{type:string,id:int,reason:string}>}
     */
    public function sync(Cart $cart, array $lines): array
    {
        $dropped = [];

        DB::transaction(function () use ($cart, $lines, &$dropped) {
            $cart->items()->delete();
            $currency = null;

            foreach ($lines as $line) {
                $model = Relation::getMorphedModel($line['type']);
                $item = $model ? $model::find($line['id']) : null;

                if (! $item instanceof Purchasable) {
                    $dropped[] = $this->drop($line, 'not_found');
                    continue;
                }

                $available = $item->cartAvailableQuantity();
                if ($available < 1) {
                    $dropped[] = $this->drop($line, 'unavailable');
                    continue;
                }

                // One currency per cart, first valid line wins.
                $currency ??= $item->cartCurrency();
                if ($item->cartCurrency() !== $currency) {
                    $dropped[] = $this->drop($line, 'currency_mismatch');
                    continue;
                }

                $flow = $item->cartFlow();
                $qty = $flow->allowsQuantity()
                    ? max(1, min((int) ($line['quantity'] ?? 1), $available))
                    : 1;

                CartItem::updateOrCreate(
                    ['cart_id' => $cart->id, 'purchasable_type' => $line['type'], 'purchasable_id' => $line['id']],
                    [
                        'flow' => $flow,
                        'quantity' => $qty,
                        'unit_price' => $item->cartUnitPrice(),
                        'snapshot' => ['name' => $item->cartName(), 'sku' => $item->cartSku()] + $item->cartSnapshot(),
                    ],
                );
            }

            $cart->update(['currency' => $currency ?? $cart->currency]);
        });

        return ['cart' => $cart->load('items'), 'dropped' => $dropped];
    }

    private function drop(array $line, string $reason): array
    {
        return ['type' => $line['type'], 'id' => $line['id'], 'reason' => $reason];
    }
}
