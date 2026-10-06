<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('brochure_path')->nullable()->after('gallery');     // PDF catalogue on the public disk
            $table->boolean('show_price')->default(true)->after('price');       // false => "Contact us for price"
        });

        Schema::table('spare_parts', function (Blueprint $table) {
            $table->boolean('show_price')->default(true)->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', fn (Blueprint $table) => $table->dropColumn(['brochure_path', 'show_price']));
        Schema::table('spare_parts', fn (Blueprint $table) => $table->dropColumn('show_price'));
    }
};
