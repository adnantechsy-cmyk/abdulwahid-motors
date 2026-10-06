<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Pending = 'pending';
    case RequiresAction = 'requires_action';
    case AwaitingConfirmation = 'awaiting_confirmation';
    case Captured = 'captured';
    case Failed = 'failed';
    case Cancelled = 'cancelled';
    case Refunded = 'refunded';
    case PartiallyRefunded = 'partially_refunded';

    /** Not finished yet: a webhook or staff action may still move it. */
    public function isOpen(): bool
    {
        return in_array($this, [self::Pending, self::RequiresAction, self::AwaitingConfirmation], true);
    }
}
