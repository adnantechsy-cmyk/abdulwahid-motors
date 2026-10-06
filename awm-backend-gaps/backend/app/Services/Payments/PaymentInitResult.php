<?php

namespace App\Services\Payments;

use App\Enums\PaymentStatus;

/** What a driver returns from initiate(). Only toClientArray() is ever sent to the browser. */
final class PaymentInitResult
{
    public function __construct(
        public readonly PaymentStatus $status,
        public readonly ?string $gatewayReference = null,
        public readonly ?string $clientSecret = null,   // Stripe Elements
        public readonly ?string $redirectUrl = null,    // hosted payment pages
        public readonly ?array $instructions = null,    // offline methods: reference, amount, account details
    ) {}

    public function toClientArray(): array
    {
        return array_filter([
            'client_secret' => $this->clientSecret,
            'redirect_url' => $this->redirectUrl,
            'instructions' => $this->instructions,
        ], fn ($v) => $v !== null);
    }
}
