<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Every message is stored before it is mailed, so nothing is lost while SMTP is not set up or is down.
        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('phone', 30)->nullable();
            $table->string('email', 120)->nullable();
            $table->string('topic', 20);                 // info | sales | parts | management
            $table->text('message');
            $table->char('locale', 2)->default('ar');
            $table->string('ip', 45)->nullable();
            $table->timestamp('mailed_at')->nullable();
            $table->timestamps();

            $table->index(['topic', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_messages');
    }
};
