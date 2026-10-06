<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Issued by JobCardService::complete(); paid online through the maintenance_invoice cart flow. */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('maintenance_invoices', function (Blueprint $table) {
            $table->id();
            $table->string('number', 32)->unique();                  // INV-2026-000123
            $table->foreignId('job_card_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->char('currency', 3)->default('USD');
            $table->decimal('parts_total', 14, 2)->default(0);
            $table->decimal('labor_total', 14, 2)->default(0);
            $table->decimal('total', 14, 2);
            $table->decimal('paid_amount', 14, 2)->default(0);
            $table->enum('status', ['unpaid', 'partially_paid', 'paid', 'void'])->default('unpaid');
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_invoices');
    }
};
