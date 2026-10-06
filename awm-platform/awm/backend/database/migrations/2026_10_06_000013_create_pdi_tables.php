<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pre-Delivery Inspection for a reserved car (Figma 1:1300 "Order Tracking & PDI Status").
 * Created automatically when a vehicle-reservation deposit is paid; the checklist is copied
 * from config('awm.pdi_checklist') so later template edits never rewrite past inspections.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('pdi_inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('vehicle_id')->constrained()->restrictOnDelete();
            $table->foreignId('technician_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['pending', 'in_progress', 'passed', 'failed'])->default('pending');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('estimated_delivery_at')->nullable();   // shown to the customer
            $table->timestamp('delivered_at')->nullable();
            $table->text('notes')->nullable();                        // staff only
            $table->json('customer_note')->nullable();                // {ar,en} shown on the tracking page
            $table->timestamps();

            $table->index('status');
        });

        Schema::create('pdi_checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pdi_inspection_id')->constrained()->cascadeOnDelete();
            $table->string('section', 30);                            // exterior | interior | battery | ...
            $table->string('code', 60);
            $table->json('label');                                    // {ar,en} copied from the template
            $table->enum('status', ['pending', 'pass', 'fail', 'na'])->default('pending');
            $table->string('note')->nullable();
            $table->foreignId('checked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('checked_at')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['pdi_inspection_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdi_checklist_items');
        Schema::dropIfExists('pdi_inspections');
    }
};
