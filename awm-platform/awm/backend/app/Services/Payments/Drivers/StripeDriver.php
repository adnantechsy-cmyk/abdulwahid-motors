<?php

namespace App\Services\Payments\Drivers;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\PaymentGateway as GatewayModel;
use App\Services\Payments\PaymentInitResult;
use App\Services\Payments\WebhookEvent;
use Illuminate\Http\Request;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;
use UnexpectedValueException;

/** composer require stripe/stripe-php. config: {secret_key, webhook_secret} */
class StripeDriver implements PaymentGateway
{
    private StripeClient $client;

    public function __construct(private GatewayModel $gateway)
    {
        $this->client = new StripeClient($this->gateway->config['secret_key']);
    }

    public function code(): string
    {
        return 'stripe';
    }

    public function isOnline(): bool
    {
        return true;
    }

    public function initiate(Payment $payment): PaymentInitResult
    {
        $intent = $this->client->paymentIntents->create([
            'amount' => $this->toMinorUnits($payment->amount),
            'currency' => strtolower($payment->currency),
            'automatic_payment_methods' => ['enabled' => true],
            'metadata' => [
                'payment_uuid' => $payment->uuid,
                'order_number' => $payment->order->number,
            ],
        ], ['idempotency_key' => $payment->idempotency_key]);

        return new PaymentInitResult(
            status: PaymentStatus::RequiresAction,
            gatewayReference: $intent->id,
            clientSecret: $intent->client_secret,
        );
    }

    public function parseWebhook(Request $request): ?WebhookEvent
    {
        try {
            $event = Webhook::constructEvent(
                $request->getContent(),
                (string) $request->header('Stripe-Signature'),
                $this->gateway->config['webhook_secret'],
            );
        } catch (SignatureVerificationException|UnexpectedValueException $e) {
            abort(400, 'Invalid Stripe webhook.');
        }

        $status = match ($event->type) {
            'payment_intent.succeeded' => PaymentStatus::Captured,
            'payment_intent.payment_failed' => PaymentStatus::Failed,
            'payment_intent.canceled' => PaymentStatus::Cancelled,
            default => null,
        };

        if ($status === null) {
            return null;
        }

        $intent = $event->data->object;

        return new WebhookEvent(
            eventId: $event->id,
            type: $event->type,
            gatewayReference: $intent->id,
            newStatus: $status,
            payload: ['id' => $intent->id, 'status' => $intent->status], // sanitised, no card data
            failureCode: $intent->last_payment_error->code ?? null,
            failureMessage: $intent->last_payment_error->message ?? null,
        );
    }

    public function refund(Payment $payment, string $amount): void
    {
        $this->client->refunds->create([
            'payment_intent' => $payment->gateway_reference,
            'amount' => $this->toMinorUnits($amount),
        ], ['idempotency_key' => "refund-{$payment->uuid}-{$amount}"]);
    }

    /** Stripe amounts are integers in the smallest unit (USD: cents). */
    private function toMinorUnits(string $amount): int
    {
        return (int) bcmul($amount, '100', 0);
    }
}
