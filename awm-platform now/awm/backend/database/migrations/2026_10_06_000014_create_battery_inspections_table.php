<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Periodic Blade battery health report + certificate (Figma 1:1899).
 * verification_code lets anyone (e.g. a used-car buyer) verify a certificate at /certificates/{code}.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('battery_inspections', function (Blueprint $table) {
            $table->id();
            $table->string('certificate_number', 32)->unique();       // BAT-2026-000123
            $table->string('verification_code', 16)->unique();
            $table->foreignId('customer_vehicle_id')->constrained()->restrictOnDelete();
            $table->foreignId('job_card_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('technician_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamp('inspected_at');
            $table->unsignedInteger('mileage_km')->nullable();
            $table->decimal('state_of_health_pct', 5, 2);             // SoH
            $table->decimal('state_of_charge_pct', 5, 2)->nullable(); // SoC at test time
            $table->decimal('pack_voltage_v', 7, 2)->nullable();
            $table->decimal('cell_voltage_min_v', 5, 3)->nullable();
            $table->decimal('cell_voltage_max_v', 5, 3)->nullable();
            $table->decimal('cell_temp_min_c', 5, 2)->nullable();
            $table->decimal('cell_temp_max_c', 5, 2)->nullable();
            $table->decimal('insulation_resistance_mohm', 8, 2)->nullable();
            $table->unsignedInteger('charge_cycles')->nullable();
            $table->json('readings')->nullable();                     // raw diagnostic export, anything else

            $table->enum('result', ['pass', 'attention', 'fail']);
            $table->json('findings')->nullable();                     // {ar,en}
            $table->json('recommendations')->nullable();              // {ar,en}
            $table->date('valid_until')->nullable();
            $table->boolean('is_revoked')->default(false);
            $table->timestamps();

            $table->index(['customer_vehicle_id', 'inspected_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('battery_inspections');
    }
};
