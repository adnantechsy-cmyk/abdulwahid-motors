<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Customers and staff share `users`; roles (spatie/permission) tell them apart. */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->unique()->after('email');
            $table->char('locale', 2)->default('ar')->after('phone');
            $table->string('preferred_branch', 30)->nullable()->after('locale'); // sahnaya | kafr_sousa
            $table->boolean('is_active')->default(true)->after('preferred_branch');
            $table->text('crm_notes')->nullable()->after('is_active');          // staff-only notes
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['phone']);
            $table->dropColumn(['phone', 'locale', 'preferred_branch', 'is_active', 'crm_notes']);
        });
    }
};
