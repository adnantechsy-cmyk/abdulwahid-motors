<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            // Logged-in customer OR anonymous visitor (token kept in the Next.js cookie).
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('guest_token', 64)->nullable()->unique();

            $table->char('currency', 3)->default('USD');
            $table->enum('status', ['active', 'converted', 'abandoned'])->default('active');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();

            // Polymorphic target: SparePart | Vehicle | MaintenanceInvoice
            // (use Relation::enforceMorphMap so these hold 'spare_part', 'vehicle', 'maintenance_invoice')
            $table->string('purchasable_type', 50);
            $table->unsignedBigInteger('purchasable_id');

            // Drives which checkout flow / order type this line belongs to.
            $table->enum('flow', ['spare_part', 'vehicle_reservation', 'maintenance_invoice']);

            // Parts: 1..stock.  Reservations & invoices: always 1 (enforced in CartService).
            $table->unsignedInteger('quantity')->default(1);

            // Price snapshot at add-to-cart time. Re-validated server-side at checkout.
            // - spare_part:           unit price of the part
            // - vehicle_reservation:  the deposit amount (NOT the car price)
            // - maintenance_invoice:  outstanding balance of the invoice
            $table->decimal('unit_price', 14, 2);

            // Display snapshot: {name:{ar,en}, sku, image, vehicle_price, ...}
            $table->json('snapshot')->nullable();
            $table->timestamps();

            $table->unique(['cart_id', 'purchasable_type', 'purchasable_id'], 'cart_items_unique_target');
            $table->index(['purchasable_type', 'purchasable_id']);
            $table->index(['cart_id', 'flow']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
    }
};
