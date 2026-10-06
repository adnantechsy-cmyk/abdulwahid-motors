<?php

namespace App\Services\Payments\Drivers;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\PaymentGateway as GatewayModel;
use App\Services\Payments\PaymentInitResult;
use App\Services\Payments\WebhookEvent;
use Illuminate\Http\Request;

/**
 * Starts as an offline-style flow (customer sends to a merchant wallet and submits the
 * transaction id), so it works before any provider API is integrated.
 *
 * TODO when a Syrian provider is chosen: call its API in initiate(), verify its
 * signature in parseWebhook(), and set isOnline() to true.
 */
class MobileMoneyDriver implements PaymentGateway
{
    public function __construct(private GatewayModel $gateway) {}

    public function code(): string
    {
        return 'mobile_money';
    }

    public function isOnline(): bool
    {
        return false;
    }

    public function initiate(Payment $payment): PaymentInitResult
    {
        return new PaymentInitResult(
            status: PaymentStatus::AwaitingConfirmation,
            gatewayReference: $payment->order->number,
            instructions: [
                'reference' => $payment->order->number,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'details' => $this->gateway->getTranslation('instructions', app()->getLocale()),
            ],
        );
    }

    public function parseWebhook(Request $request): ?WebhookEvent
    {
        return null;
    }

    public function refund(Payment $payment, string $amount): void {}
}
