<?php

namespace Database\Seeders;

use App\Models\PaymentGateway;
use App\Services\Payments\Drivers\BankTransferDriver;
use App\Services\Payments\Drivers\MobileMoneyDriver;
use App\Services\Payments\Drivers\StripeDriver;
use Illuminate\Database\Seeder;

/**
 * Creates the gateway rows once. Re-running never overwrites what staff later edited
 * in the admin panel (instructions, active flag, keys).
 */
class PaymentGatewaySeeder extends Seeder
{
    public function run(): void
    {
        $this->seed('bank_transfer', [
            'driver' => BankTransferDriver::class,
            'name' => ['ar' => 'تحويل مصرفي', 'en' => 'Bank transfer'],
            'instructions' => [
                'ar' => 'حوّل المبلغ إلى الحساب المصرفي للشركة واذكر رقم الطلب في ملاحظة التحويل، ثم ارفع صورة الإيصال. (يُحدَّث من لوحة التحكم)',
                'en' => 'Transfer the amount to the company bank account quoting your order number, then upload the receipt. (Edit in the admin panel.)',
            ],
            'is_active' => true,
            'is_online' => false,
            'supported_currencies' => ['USD', 'SYP'],
            'supported_flows' => null,
            'sort_order' => 1,
        ]);

        $this->seed('mobile_money', [
            'driver' => MobileMoneyDriver::class,
            'name' => ['ar' => 'الدفع عبر المحفظة الإلكترونية', 'en' => 'Mobile money'],
            'instructions' => [
                'ar' => 'أرسل المبلغ إلى محفظة الشركة وأدخل رقم العملية مع رقم الطلب. (يُحدَّث من لوحة التحكم)',
                'en' => 'Send the amount to the company wallet and submit the transaction ID with your order number. (Edit in the admin panel.)',
            ],
            'is_active' => true,
            'is_online' => false,
            'supported_currencies' => ['SYP'],
            'supported_flows' => null,
            'sort_order' => 2,
        ]);

        // Inactive until a card processor that can serve this business is set up.
        // Keys come from .env on first seed only; afterwards they live encrypted in the DB.
        $this->seed('stripe', [
            'driver' => StripeDriver::class,
            'name' => ['ar' => 'بطاقة ائتمان', 'en' => 'Credit / debit card'],
            'is_active' => false,
            'is_online' => true,
            'supported_currencies' => ['USD'],
            'supported_flows' => null,
            'config' => ['secret_key' => env('STRIPE_SECRET'), 'webhook_secret' => env('STRIPE_WEBHOOK_SECRET')],
            'sort_order' => 3,
        ]);
    }

    private function seed(string $code, array $attributes): void
    {
        if (PaymentGateway::where('code', $code)->exists()) {
            return;
        }

        PaymentGateway::create(['code' => $code] + $attributes);
    }
}
