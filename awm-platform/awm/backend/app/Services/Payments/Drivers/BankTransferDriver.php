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
 * Offline: the customer transfers money and uploads a receipt.
 * Staff then confirm it from the admin panel (PaymentService::confirmOffline).
 */
class BankTransferDriver implements PaymentGateway
{
    public function __construct(private GatewayModel $gateway) {}

    public function code(): string
    {
        return 'bank_transfer';
    }

    public function isOnline(): bool
    {
        return false;
    }

    public function initiate(Payment $payment): PaymentInitResult
    {
        $locale = app()->getLocale();

        return new PaymentInitResult(
            status: PaymentStatus::AwaitingConfirmation,
            gatewayReference: $payment->order->number, // customer quotes this on the transfer
            instructions: [
                'reference' => $payment->order->number,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'details' => $this->gateway->getTranslation('instructions', $locale),
            ],
        );
    }

    public function parseWebhook(Request $request): ?WebhookEvent
    {
        return null; // no callbacks: confirmation is manual
    }

    public function refund(Payment $payment, string $amount): void
    {
        // Money is returned by hand; PaymentService records the refund amount.
    }
}
