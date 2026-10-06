<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** CRM: cars a customer owns (bought here or elsewhere). Job cards attach to these. */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('customer_vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete(); // set if sold by AWM
            $table->string('vin', 17)->nullable()->unique();
            $table->string('plate_number', 30)->nullable()->index();
            $table->string('make', 40)->default('BYD');
            $table->string('model', 60);
            $table->unsignedSmallInteger('model_year')->nullable();
            $table->string('color', 40)->nullable();
            $table->unsignedInteger('last_mileage_km')->nullable();
            $table->date('purchased_at')->nullable();
            $table->date('warranty_until')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_vehicles');
    }
};
