<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Every amount collected against a maintenance invoice (Figma 1:21010 "Billing & collection"):
 * online payments (via the cart) and money taken at the counter. Append-only.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maintenance_invoice_id')->constrained()->restrictOnDelete();
            $table->decimal('amount', 14, 2);
            $table->char('currency', 3);
            $table->enum('method', ['online', 'cash', 'bank_transfer', 'mobile_money', 'card_terminal']);
            $table->string('reference', 100)->nullable();             // order number, transfer ref, receipt no.
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('received_at');
            $table->string('note')->nullable();
            $table->timestamps();

            $table->index(['maintenance_invoice_id', 'received_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_payments');
    }
};
