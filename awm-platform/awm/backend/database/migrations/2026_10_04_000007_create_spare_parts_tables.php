<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('spare_parts', function (Blueprint $table) {
            $table->id();
            $table->string('sku', 100)->unique();
            $table->string('slug')->unique();
            $table->string('oem_number', 100)->nullable()->index();  // BYD part number

            $table->json('name');
            $table->json('description')->nullable();
            $table->string('category', 60)->nullable()->index();     // becomes a FK if the categories module is approved

            $table->decimal('price', 14, 2);
            $table->decimal('cost_price', 14, 2)->nullable();        // staff only, never exposed publicly
            $table->char('currency', 3)->default('USD');
            $table->boolean('is_oem')->default(true);
            $table->json('compatible_models')->nullable();           // ["Atto 3", "Seal", ...]

            // stock_quantity changes ONLY through StockService (audited in stock_movements).
            $table->integer('stock_quantity')->default(0);
            $table->integer('reserved_quantity')->default(0);         // held by unpaid web orders (signed: keeps (stock - reserved) math safe in MySQL)
            $table->unsignedInteger('low_stock_threshold')->default(2);
            $table->string('bin_location', 40)->nullable();          // shelf / bin in the warehouse

            $table->string('cover_image')->nullable();
            $table->json('gallery')->nullable();
            $table->boolean('is_published')->default(false);
            $table->boolean('hide_when_out_of_stock')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_published', 'category']);
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spare_part_id')->constrained()->restrictOnDelete();
            // purchase | sale | maintenance_usage | adjustment | return
            $table->string('type', 30);
            $table->integer('quantity_change');                      // + in, - out
            $table->integer('balance_after');
            $table->nullableMorphs('reference');                     // order | job_card
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('note')->nullable();
            $table->timestamps();

            $table->index(['spare_part_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('spare_parts');
    }
};
