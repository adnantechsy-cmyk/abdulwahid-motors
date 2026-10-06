<?php

namespace App\Services\Payments;

use App\Contracts\PaymentGateway as GatewayContract;
use App\Models\PaymentGateway;
use InvalidArgumentException;

/** Resolves the driver class stored in payment_gateways.driver. */
class PaymentManager
{
    /** @var array<string, GatewayContract> */
    private array $resolved = [];

    public function driver(PaymentGateway $gateway): GatewayContract
    {
        return $this->resolved[$gateway->code] ??= $this->make($gateway);
    }

    public function driverByCode(string $code): GatewayContract
    {
        $gateway = PaymentGateway::where('code', $code)->where('is_active', true)->firstOrFail();

        return $this->driver($gateway);
    }

    private function make(PaymentGateway $gateway): GatewayContract
    {
        $class = $gateway->driver;

        if (! is_a($class, GatewayContract::class, true)) {
            throw new InvalidArgumentException("Driver [$class] must implement the PaymentGateway contract.");
        }

        return new $class($gateway);
    }
}
