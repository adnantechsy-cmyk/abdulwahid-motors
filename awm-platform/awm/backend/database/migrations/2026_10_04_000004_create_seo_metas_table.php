<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('seo_metas', function (Blueprint $table) {
            $table->id();

            // Target is EITHER a model (vehicle, spare part, CMS page)...
            $table->nullableMorphs('seoable');
            // ...OR a code-defined route with no model (home, contact, about, listing pages).
            $table->string('route_key', 120)->nullable()->unique();

            // spatie/laravel-translatable columns: {"ar": "...", "en": "..."}
            $table->json('meta_title')->nullable();
            $table->json('meta_description')->nullable();
            $table->json('keywords')->nullable();
            $table->json('og_title')->nullable();
            $table->json('og_description')->nullable();

            $table->string('og_image')->nullable();
            $table->string('og_type', 30)->default('website');     // website | product | article
            $table->string('twitter_card', 30)->default('summary_large_image');
            $table->string('canonical_url', 500)->nullable();
            $table->string('robots', 60)->default('index,follow');

            // Per-entity override merged on top of the auto-generated JSON-LD (Vehicle / Product / LocalBusiness).
            $table->json('schema_overrides')->nullable();

            // Sitemap controls
            $table->boolean('in_sitemap')->default(true);
            $table->decimal('sitemap_priority', 2, 1)->default(0.5);
            $table->enum('sitemap_changefreq', ['always','hourly','daily','weekly','monthly','yearly','never'])->default('weekly');

            $table->timestamps();

            $table->unique(['seoable_type', 'seoable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seo_metas');
    }
};
