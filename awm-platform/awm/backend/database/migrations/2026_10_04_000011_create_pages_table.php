<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin-editable CMS content (About sections, Services, policies...).
 * Static routes (home, contact...) keep their SEO in seo_metas.route_key; a Page gets its own seo_metas row.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();                        // about, services, privacy-policy
            $table->json('title');
            $table->json('excerpt')->nullable();
            $table->json('body')->nullable();                        // rich text per locale
            $table->json('sections')->nullable();                    // structured blocks, e.g. vision/mission/values
            $table->string('template', 40)->default('default');
            $table->boolean('is_published')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pages');
    }
};
