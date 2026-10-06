<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Services\Checkout\CartService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CartController extends Controller
{
    public function __construct(private CartService $carts) {}

    /** PUT /api/v1/cart  Body: {lines:[{type,id,quantity}]}. Header X-Cart-Token for guests. */
    public function sync(Request $request)
    {
        $data = $request->validate([
            'lines' => ['present', 'array', 'max:50'],
            'lines.*.type' => ['required', 'in:spare_part,vehicle,maintenance_invoice'],
            'lines.*.id' => ['required', 'integer', 'min:1'],
            'lines.*.quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
        ]);

        $cart = $this->resolveCart($request);
        $result = $this->carts->sync($cart, $data['lines']);

        return response()->json([
            'cart_token' => $cart->guest_token,
            'currency' => $result['cart']->currency,
            'items' => $result['cart']->items->map(fn ($i) => [
                'type' => $i->purchasable_type,
                'id' => $i->purchasable_id,
                'flow' => $i->flow->value,
                'quantity' => $i->quantity,
                'unit_price' => $i->unit_price,
                'snapshot' => $i->snapshot,
            ]),
            'dropped' => $result['dropped'],
        ])->header('X-Cart-Token', $cart->guest_token ?? '');
    }

    private function resolveCart(Request $request): Cart
    {
        if ($user = $request->user()) {
            return Cart::firstOrCreate(['user_id' => $user->id, 'status' => 'active']);
        }

        $token = $request->header('X-Cart-Token');
        $cart = $token ? Cart::where('guest_token', $token)->where('status', 'active')->first() : null;

        return $cart ?? Cart::create(['guest_token' => Str::random(48), 'status' => 'active']);
    }
}
