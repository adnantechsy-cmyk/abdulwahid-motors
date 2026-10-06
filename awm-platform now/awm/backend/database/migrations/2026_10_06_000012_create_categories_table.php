<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Admin-managed categories for showroom cars and spare parts (Figma 1:5479).
 * Replaces the free-text spare_parts.category column: existing values are converted first.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['vehicle', 'spare_part']);
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('slug', 80);
            $table->json('name');
            $table->json('description')->nullable();
            $table->string('image')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['type', 'slug']);
            $table->index(['type', 'is_active', 'sort_order']);
        });

        Schema::table('spare_parts', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('description')->constrained()->nullOnDelete();
        });
        Schema::table('vehicles', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('description')->constrained()->nullOnDelete();
        });

        // Convert the old free-text values into category rows.
        $existing = DB::table('spare_parts')->whereNotNull('category')->distinct()->pluck('category');
        foreach ($existing as $label) {
            $slug = Str::slug($label) ?: 'category-' . Str::random(6);
            $id = DB::table('categories')->where(['type' => 'spare_part', 'slug' => $slug])->value('id')
                ?? DB::table('categories')->insertGetId([
                    'type' => 'spare_part',
                    'slug' => $slug,
                    'name' => json_encode(['ar' => $label, 'en' => Str::title(str_replace('-', ' ', $label))], JSON_UNESCAPED_UNICODE),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            DB::table('spare_parts')->where('category', $label)->update(['category_id' => $id]);
        }

        Schema::table('spare_parts', function (Blueprint $table) {
            $table->dropIndex(['is_published', 'category']);
            $table->dropIndex(['category']);
            $table->dropColumn('category');
            $table->index(['is_published', 'category_id']);
        });
    }

    public function down(): void
    {
        Schema::table('spare_parts', function (Blueprint $table) {
            $table->string('category', 60)->nullable()->index()->after('description');
        });
        DB::table('spare_parts')->whereNotNull('category_id')->orderBy('id')->each(function ($p) {
            DB::table('spare_parts')->where('id', $p->id)
                ->update(['category' => DB::table('categories')->where('id', $p->category_id)->value('slug')]);
        });
        Schema::table('spare_parts', function (Blueprint $table) {
            $table->dropIndex(['is_published', 'category_id']);
            $table->dropConstrainedForeignId('category_id');
            $table->index(['is_published', 'category']);
        });
        Schema::table('vehicles', fn (Blueprint $t) => $t->dropConstrainedForeignId('category_id'));
        Schema::dropIfExists('categories');
    }
};
