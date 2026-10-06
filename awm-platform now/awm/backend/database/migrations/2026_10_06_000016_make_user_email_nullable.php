<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Many customers register with a phone number only. Unique still applies to non-null emails. */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->string('email')->nullable()->change());
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->string('email')->nullable(false)->change());
    }
};
