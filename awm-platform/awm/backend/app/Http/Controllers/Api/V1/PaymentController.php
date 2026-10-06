<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Services\Checkout\CheckoutException;
use App\Services\Payments\PaymentService;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private PaymentService $payments) {}

    /** GET /api/v1/orders/{number}/payment-methods */
    public function methods(string $number)
    {
        $order = Order::where('number', $number)->firstOrFail();

        return PaymentGateway::where('is_active', true)->orderBy('sort_order')->get()
            ->filter(fn ($g) => $g->supports($order->currency, $order->flow->value))
            ->map(fn ($g) => [
                'code' => $g->code,
                'name' => $g->name,           // translated by spatie for the current locale
                'is_online' => $g->is_online,
            ])->values();
    }

    /** POST /api/v1/orders/{number}/pay   Header: Idempotency-Key */
    public function pay(Request $request, string $number)
    {
        $data = $request->validate(['gateway' => ['required', 'string']]);
        $key = $request->header('Idempotency-Key') ?? abort(422, 'Idempotency-Key header required.');

        // Guests prove ownership with the order number + phone they entered at checkout.
        $order = Order::where('number', $number)->firstOrFail();
        $this->authorizeOrder($request, $order);

        try {
            [$payment, $result] = $this->payments->initiate($order, $data['gateway'], $key);
        } catch (CheckoutException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => $e->errorCode], 422);
        }

        return response()->json([
            'payment_id' => $payment->uuid,
            'status' => $payment->status->value,
        ] + ($result?->toClientArray() ?? []));
    }

    /** POST /api/v1/payments/{uuid}/proof  (bank transfer receipt upload) */
    public function uploadProof(Request $request, string $uuid)
    {
        $request->validate(['proof' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120']]);
        $payment = Payment::where('uuid', $uuid)->firstOrFail();
        $this->authorizeOrder($request, $payment->order);

        $payment->update(['proof_path' => $request->file('proof')->store("payment-proofs/{$payment->uuid}", 'private')]);

        return response()->json(['status' => $payment->status->value]);
    }

    /** POST /api/v1/webhooks/{gateway}  (no auth; verified by signature in the driver) */
    public function webhook(Request $request, string $gateway)
    {
        $this->payments->handleWebhook($gateway, $request);

        return response()->noContent();
    }

    /** POST /api/v1/admin/payments/{uuid}/confirm  (permission: payments.confirm) */
    public function confirm(Request $request, string $uuid)
    {
        $payment = Payment::where('uuid', $uuid)->firstOrFail();

        try {
            $payment = $this->payments->confirmOffline($payment, $request->user());
        } catch (CheckoutException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => $e->errorCode], 422);
        }

        return response()->json(['status' => $payment->status->value]);
    }

    /** POST /api/v1/admin/payments/{uuid}/reject */
    public function reject(Request $request, string $uuid)
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        $payment = $this->payments->rejectOffline(Payment::where('uuid', $uuid)->firstOrFail(), $request->user(), $data['reason']);

        return response()->json(['status' => $payment->status->value]);
    }

    /** Digits only, constant-time: "0944 111 222" and "+963944111222" are the same guest, and timing leaks nothing. */
    private function samePhone(string $stored, string $given): bool
    {
        $norm = function (string $p): string {
            $d = preg_replace('/\D/', '', $p);

            return str_starts_with($d, '963') ? '0' . substr($d, 3) : $d;
        };
        $a = $norm($stored);

        return $a !== '' && hash_equals($a, $norm($given));
    }

    private function authorizeOrder(Request $request, Order $order): void
    {
        $ok = $request->user()
            ? $order->user_id === $request->user()->id
            : ($order->user_id === null && $this->samePhone((string) ($order->customer['phone'] ?? ''), (string) $request->input('phone', $request->header('X-Customer-Phone', ''))));

        abort_unless($ok, 403);
    }
}
