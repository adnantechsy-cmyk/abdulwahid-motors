<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('two_factor_secret')->nullable();            // encrypted with APP_KEY
            $table->text('two_factor_recovery_codes')->nullable();    // encrypted JSON list of hashed one-time codes
            $table->timestamp('two_factor_confirmed_at')->nullable(); // set once the user proved their app works
            $table->unsignedBigInteger('two_factor_last_step')->nullable(); // last accepted 30-second step: a code can't be used twice
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn([
            'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at', 'two_factor_last_step',
        ]));
    }
};