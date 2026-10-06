<?php

namespace App\Contracts;

use App\Models\Payment;
use App\Services\Payments\PaymentInitResult;
use App\Services\Payments\WebhookEvent;
use Illuminate\Http\Request;

interface PaymentGateway
{
    /** Unique code matching payment_gateways.code. */
    public function code(): string;

    /** True if the customer can complete payment online without staff involvement. */
    public function isOnline(): bool;

    /** Start a payment for $payment->order. Must be safe to call once per Payment row. */
    public function initiate(Payment $payment): PaymentInitResult;

    /**
     * Parse + verify an inbound webhook/callback (signature checks live here).
     * Return null for events we don't care about. Throw on invalid signature.
     */
    public function parseWebhook(Request $request): ?WebhookEvent;

    /** Refund up to $amount. Offline gateways may record the refund and return without calling an API. */
    public function refund(Payment $payment, string $amount): void;
}
