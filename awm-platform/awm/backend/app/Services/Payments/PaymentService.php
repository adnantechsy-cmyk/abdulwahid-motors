<?php

namespace App\Services\Payments;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentEvent;
use App\Models\PaymentGateway;
use App\Models\User;
use App\Services\Checkout\CheckoutException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function __construct(private PaymentManager $gateways) {}

    /** Start (or resume) a payment. Retrying with the same idempotency key returns the same Payment. */
    public function initiate(Order $order, string $gatewayCode, string $idempotencyKey): array
    {
        $gateway = PaymentGateway::where('code', $gatewayCode)->where('is_active', true)->first();

        if (! $gateway || ! $gateway->supports($order->currency, $order->flow->value)) {
            throw new CheckoutException('Payment method not available for this order.', 'gateway_unsupported');
        }
        if (! $order->status->isPayable()) {
            throw new CheckoutException('Order is not payable.', 'order_not_payable');
        }

        $payment = Payment::firstOrCreate(
            ['idempotency_key' => $idempotencyKey],
            [
                'order_id' => $order->id,
                'payment_gateway_id' => $gateway->id,
                'status' => PaymentStatus::Pending,
                'amount' => $order->grand_total,
                'currency' => $order->currency,
            ],
        );

        if ($payment->order_id !== $order->id || $payment->payment_gateway_id !== $gateway->id) {
            throw new CheckoutException('Idempotency key already used for another payment.', 'idempotency_conflict');
        }

        // Already initiated on a previous call: don't hit the gateway twice.
        if ($payment->gateway_reference !== null) {
            return [$payment, null];
        }

        $result = $this->gateways->driver($gateway)->initiate($payment);

        $payment->update(['status' => $result->status, 'gateway_reference' => $result->gatewayReference]);
        $order->update(['status' => OrderStatus::AwaitingPayment]);

        return [$payment->fresh(), $result];
    }

    /** POST /webhooks/{gateway}. Verified by the driver, deduplicated by (gateway, event id). */
    public function handleWebhook(string $gatewayCode, Request $request): void
    {
        $event = $this->gateways->driverByCode($gatewayCode)->parseWebhook($request);
        if ($event === null) {
            return;
        }

        try {
            $log = PaymentEvent::create([
                'gateway_code' => $gatewayCode,
                'event_id' => $event->eventId,
                'type' => $event->type,
                'payload' => $event->payload,
            ]);
        } catch (UniqueConstraintViolationException) {
            return; // already processed: Stripe retries are normal
        }

        $payment = Payment::where('gateway_reference', $event->gatewayReference)
            ->whereHas('gateway', fn ($q) => $q->where('code', $gatewayCode))
            ->first();

        if ($payment) {
            $log->update(['payment_id' => $payment->id]);
            $this->applyStatus($payment, $event->newStatus, $event->failureCode, $event->failureMessage, $event->payload);
        }

        $log->update(['processed_at' => now()]);
    }

    /** Staff verified the transfer / wallet payment in the admin panel. */
    public function confirmOffline(Payment $payment, User $staff): Payment
    {
        if ($payment->status !== PaymentStatus::AwaitingConfirmation) {
            throw new CheckoutException('Payment is not awaiting confirmation.', 'bad_state');
        }

        $payment->update(['confirmed_by' => $staff->id, 'confirmed_at' => now()]);

        return $this->applyStatus($payment, PaymentStatus::Captured);
    }

    public function rejectOffline(Payment $payment, User $staff, string $reason): Payment
    {
        $payment->update(['confirmed_by' => $staff->id, 'confirmed_at' => now()]);

        return $this->applyStatus($payment, PaymentStatus::Failed, 'rejected', $reason);
    }

    /** Single place where payment + order state change. Row-locked and idempotent. */
    private function applyStatus(Payment $payment, PaymentStatus $new, ?string $code = null, ?string $message = null, array $payload = []): Payment
    {
        return DB::transaction(function () use ($payment, $new, $code, $message, $payload) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();

            // Never walk a finished payment backwards (late "failed" after "captured", etc.).
            if (! $payment->status->isOpen() && $payment->status !== $new) {
                return $payment;
            }
            if ($payment->status === $new) {
                return $payment;
            }

            $payment->fill([
                'status' => $new,
                'failure_code' => $code,
                'failure_message' => $message,
                'payload' => $payload ?: $payment->payload,
                'captured_at' => $new === PaymentStatus::Captured ? now() : $payment->captured_at,
            ])->save();

            $order = Order::whereKey($payment->order_id)->lockForUpdate()->firstOrFail();

            if ($new === PaymentStatus::Captured && $order->status !== OrderStatus::Paid) {
                $order->update(['status' => OrderStatus::Paid, 'paid_at' => now()]);

                foreach ($order->items()->with('orderable')->get() as $line) {
                    $line->orderable?->onOrderPaid($order, $line->quantity);
                }
            } elseif (in_array($new, [PaymentStatus::Failed, PaymentStatus::Cancelled], true) && $order->status->isPayable()) {
                $order->update(['status' => OrderStatus::Failed]); // still payable: customer can retry
            }

            return $payment;
        });
    }
}
