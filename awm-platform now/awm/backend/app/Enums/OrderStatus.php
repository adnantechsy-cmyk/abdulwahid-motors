<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pending = 'pending';
    case AwaitingPayment = 'awaiting_payment';
    case Paid = 'paid';
    case Processing = 'processing';
    case Fulfilled = 'fulfilled';
    case Cancelled = 'cancelled';
    case Failed = 'failed';
    case Refunded = 'refunded';
    case PartiallyRefunded = 'partially_refunded';

    /**
     * The customer can still (re)try paying. Also the states an order may be cancelled from.
     * Failed stays payable on purpose: a declined card should not kill the order.
     */
    public function isPayable(): bool
    {
        return in_array($this, [self::Pending, self::AwaitingPayment, self::Failed], true);
    }
}
