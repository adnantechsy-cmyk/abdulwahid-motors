<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Services\Checkout\CheckoutException;
use App\Services\Checkout\CheckoutService;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    public function __construct(private CheckoutService $checkout) {}

    /** POST /api/v1/checkout. Returns one order per flow present in the cart. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'customer.name' => ['required', 'string', 'max:120'],
            'customer.phone' => ['required', 'string', 'max:30'],
            'customer.email' => ['nullable', 'email'],
            'shipping_address' => ['nullable', 'array'],
            'branch_pickup' => ['nullable', 'in:sahnaya,kafr_sousa'],
        ]);

        $cart = $request->user()
            ? Cart::where('user_id', $request->user()->id)->where('status', 'active')->firstOrFail()
            : Cart::where('guest_token', $request->header('X-Cart-Token'))->where('status', 'active')->firstOrFail();

        try {
            $orders = $this->checkout->placeOrders($cart, $data['customer'], $data['shipping_address'] ?? null, $data['branch_pickup'] ?? null);
        } catch (CheckoutException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => $e->errorCode], 422);
        }

        return response()->json([
            'orders' => $orders->map(fn ($o) => [
                'number' => $o->number,
                'flow' => $o->flow->value,
                'currency' => $o->currency,
                'grand_total' => $o->grand_total,
            ]),
        ], 201);
    }
}
