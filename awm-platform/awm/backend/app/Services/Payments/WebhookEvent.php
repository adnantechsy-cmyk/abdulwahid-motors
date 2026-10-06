<?php

namespace App\Services\Payments;

use App\Enums\PaymentStatus;

/** A verified, normalised gateway callback produced by a driver's parseWebhook(). */
final class WebhookEvent
{
    public function __construct(
        public readonly string $eventId,
        public readonly string $type,
        public readonly string $gatewayReference,
        public readonly PaymentStatus $newStatus,
        public readonly array $payload = [],
        public readonly ?string $failureCode = null,
        public readonly ?string $failureMessage = null,
    ) {}
}
