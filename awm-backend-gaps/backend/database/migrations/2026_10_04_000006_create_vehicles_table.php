<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Showroom stock: BYD cars for sale. Customers' own cars live in customer_vehicles. */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('sku', 60)->nullable()->unique();         // internal stock number
            $table->string('vin', 17)->nullable()->unique();

            // spatie/laravel-translatable: {"ar": "...", "en": "..."}
            $table->json('name');
            $table->json('tagline')->nullable();
            $table->json('description')->nullable();

            $table->unsignedSmallInteger('model_year');
            $table->string('body_type', 30)->nullable();             // sedan | suv | hatchback | pickup
            $table->enum('powertrain', ['bev', 'phev', 'hev', 'ice'])->default('bev');
            $table->string('exterior_color', 40)->nullable();
            $table->json('specs')->nullable();                       // {range_km, battery_kwh, power_kw, seats, ...}

            $table->decimal('price', 14, 2);
            $table->decimal('deposit_amount', 14, 2)->default(0);    // what the customer pays online to reserve
            $table->char('currency', 3)->default('USD');

            $table->enum('status', ['available', 'incoming', 'reserved', 'sold'])->default('available');
            $table->foreignId('reserved_order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->timestamp('reserved_at')->nullable();
            $table->timestamp('sold_at')->nullable();

            $table->string('branch', 30)->nullable();                // sahnaya | kafr_sousa
            $table->string('cover_image')->nullable();               // path on the public disk
            $table->json('gallery')->nullable();                     // [paths]

            $table->boolean('is_published')->default(false);        // admin "hide" toggle
            $table->boolean('is_featured')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_published', 'status']);
            $table->index(['powertrain', 'body_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
