<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Service appointment requests (Figma 1:4791). Confirmed appointments convert into job cards. */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->string('number', 32)->unique();                   // APT-2026-000123
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('customer_vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->string('contact_name', 120);
            $table->string('contact_phone', 30);
            $table->string('vehicle_description', 120)->nullable();   // guests: "BYD Atto 3 2024"

            $table->string('branch', 30);
            $table->enum('service_type', ['maintenance', 'repair', 'diagnostics', 'warranty', 'inspection', 'battery_check']);
            $table->dateTime('starts_at');                            // slot start, branch-local time
            $table->enum('status', ['requested', 'confirmed', 'cancelled', 'completed', 'no_show'])->default('requested');
            $table->text('customer_notes')->nullable();
            $table->text('staff_notes')->nullable();

            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('job_card_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['branch', 'starts_at', 'status']);
            $table->index(['user_id', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
