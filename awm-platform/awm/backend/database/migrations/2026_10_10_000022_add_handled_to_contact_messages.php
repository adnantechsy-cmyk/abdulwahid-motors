<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->timestamp('handled_at')->nullable()->after('mailed_at');
            $table->foreignId('handled_by')->nullable()->after('handled_at')->constrained('users')->nullOnDelete();
            $table->index('handled_at');
        });
    }

    public function down(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('handled_by');
            $table->dropIndex(['handled_at']);
            $table->dropColumn('handled_at');
        });
    }
};