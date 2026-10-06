<?php

namespace App\Services\Checkout;

use RuntimeException;

/**
 * Business-rule failure during cart/checkout/payment. Controllers turn it into a 422
 * with a machine-readable code the frontend can translate.
 * (Exception::$code must be an int, hence the separate $errorCode.)
 */
class CheckoutException extends RuntimeException
{
    public function __construct(string $message, public readonly string $errorCode = 'checkout_error')
    {
        parent::__construct($message);
    }
}
