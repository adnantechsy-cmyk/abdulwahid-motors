<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // One row per configured gateway. `driver` is a class implementing
        // App\Contracts\PaymentGateway, resolved by PaymentManager.
        Schema::create('payment_gateways', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();                  // stripe | mobile_money | bank_transfer
            $table->string('driver');                              // App\Services\Payments\Drivers\StripeDriver
            $table->json('name');                                  // {ar, en}
            $table->json('instructions')->nullable();              // shown for offline methods (account no., etc.)
            $table->boolean('is_active')->default(true);
            $table->boolean('is_online')->default(true);           // false = manual confirmation by staff
            $table->json('supported_currencies');                  // ["USD"] or ["SYP"]
            $table->json('supported_flows')->nullable();           // null = all flows
            $table->text('config')->nullable();                    // cast: encrypted:array  (API keys, merchant IDs)
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_gateway_id')->constrained()->restrictOnDelete();

            $table->enum('status', [
                'pending',
                'requires_action',          // 3DS / redirect to hosted page
                'awaiting_confirmation',    // offline: customer says they paid, staff must verify
                'captured',
                'failed',
                'cancelled',
                'refunded',
                'partially_refunded',
            ])->default('pending');

            $table->decimal('amount', 14, 2);
            $table->decimal('refunded_amount', 14, 2)->default(0);
            $table->char('currency', 3);

            $table->string('gateway_reference')->nullable();       // Stripe PaymentIntent id, mobile-money txn id, bank ref
            $table->string('idempotency_key', 80)->unique();       // safe retries from the client
            $table->string('proof_path')->nullable();              // uploaded transfer receipt (bank transfer)
            $table->string('failure_code', 80)->nullable();
            $table->text('failure_message')->nullable();
            $table->json('payload')->nullable();                   // sanitised gateway response (never raw card data)

            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('captured_at')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
            $table->index(['payment_gateway_id', 'gateway_reference']);
        });

        // Webhook / callback log. The unique key makes webhook handling idempotent.
        Schema::create('payment_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('gateway_code', 50);
            $table->string('event_id', 120);
            $table->string('type', 120);
            $table->json('payload');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->unique(['gateway_code', 'event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_events');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('payment_gateways');
    }
};
