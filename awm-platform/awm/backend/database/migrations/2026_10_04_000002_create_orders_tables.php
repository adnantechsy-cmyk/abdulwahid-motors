<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Checkout splits a mixed cart into ONE order per flow, so each order has a
        // single payment/fulfilment lifecycle (a deposit is not shipped like a part).
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('number', 32)->unique();               // e.g. AWM-2026-000123
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('cart_id')->nullable()->constrained()->nullOnDelete();

            $table->enum('flow', ['spare_part', 'vehicle_reservation', 'maintenance_invoice']);
            $table->enum('status', [
                'pending',            // created, no payment attempted
                'awaiting_payment',   // payment started / offline method waiting for confirmation
                'paid',
                'processing',         // parts: picking/packing; reservation: awaiting sales call
                'fulfilled',          // delivered / vehicle reserved & confirmed / invoice settled
                'cancelled',
                'failed',
                'refunded',
                'partially_refunded',
            ])->default('pending');

            $table->char('currency', 3);
            $table->decimal('subtotal', 14, 2);
            $table->decimal('discount_total', 14, 2)->default(0);
            $table->decimal('tax_total', 14, 2)->default(0);
            $table->decimal('shipping_total', 14, 2)->default(0);
            $table->decimal('grand_total', 14, 2);

            // Customer contact / delivery details captured at checkout (guests included).
            $table->json('customer');                              // {name, phone, email}
            $table->json('shipping_address')->nullable();
            $table->string('branch_pickup')->nullable();           // 'sahnaya' | 'kafr_sousa'
            $table->text('notes')->nullable();

            $table->timestamp('placed_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['flow', 'status']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();

            $table->string('orderable_type', 50);
            $table->unsignedBigInteger('orderable_id');

            $table->json('name');                                  // frozen {ar, en}
            $table->string('sku', 100)->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('unit_price', 14, 2);
            $table->decimal('line_total', 14, 2);
            $table->json('snapshot')->nullable();
            $table->timestamps();

            $table->index(['orderable_type', 'orderable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
