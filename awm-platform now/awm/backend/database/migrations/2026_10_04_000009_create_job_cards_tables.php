<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('job_cards', function (Blueprint $table) {
            $table->id();
            $table->string('number', 32)->unique();                  // JC-2026-000123
            $table->foreignId('customer_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('customer_vehicle_id')->constrained()->restrictOnDelete();
            $table->foreignId('technician_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->string('branch', 30);                            // sahnaya | kafr_sousa
            $table->enum('status', ['pending', 'in_progress', 'waiting_parts', 'completed'])->default('pending');
            $table->enum('service_type', ['maintenance', 'repair', 'diagnostics', 'warranty', 'inspection'])->default('maintenance');

            $table->text('complaint')->nullable();                   // what the customer reported
            $table->text('diagnosis')->nullable();                   // technician findings
            $table->text('work_done')->nullable();
            $table->unsignedInteger('mileage_in_km')->nullable();

            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'branch']);
            $table->index(['technician_id', 'status']);
        });

        Schema::create('job_card_parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_card_id')->constrained()->cascadeOnDelete();
            $table->foreignId('spare_part_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 14, 2);                    // price frozen when the part was used
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_card_parts');
        Schema::dropIfExists('job_cards');
    }
};
