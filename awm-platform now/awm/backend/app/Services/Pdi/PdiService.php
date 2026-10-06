<?php

namespace App\Services\Pdi;

use App\Enums\OrderStatus;
use App\Enums\PdiStatus;
use App\Enums\VehicleStatus;
use App\Models\CustomerVehicle;
use App\Models\Order;
use App\Models\PdiChecklistItem;
use App\Models\PdiInspection;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\Checkout\CheckoutException;
use Illuminate\Support\Facades\DB;

class PdiService
{
    /** Called when a reservation deposit is captured. Idempotent: webhook retries are safe. */
    public function openForOrder(Order $order, Vehicle $vehicle): PdiInspection
    {
        return DB::transaction(function () use ($order, $vehicle) {
            $existing = PdiInspection::where('order_id', $order->id)->first();
            if ($existing) {
                return $existing;
            }

            $pdi = PdiInspection::create([
                'order_id' => $order->id,
                'vehicle_id' => $vehicle->id,
                'status' => PdiStatus::Pending,
                'estimated_delivery_at' => now()->addDays((int) config('awm.pdi.default_days', 3)),
            ]);

            $sort = 0;
            foreach (config('awm.pdi_checklist') as $section => $items) {
                foreach ($items as $code => $label) {
                    PdiChecklistItem::create([
                        'pdi_inspection_id' => $pdi->id,
                        'section' => $section,
                        'code' => $code,
                        'label' => $label,
                        'sort_order' => $sort++,
                    ]);
                }
            }

            $order->update(['status' => OrderStatus::Processing]);

            return $pdi;
        });
    }

    public function start(PdiInspection $pdi, User $technician): PdiInspection
    {
        if ($pdi->status !== PdiStatus::Pending) {
            throw new CheckoutException('Inspection already started.', 'pdi_bad_state');
        }
        $pdi->update(['status' => PdiStatus::InProgress, 'technician_id' => $technician->id, 'started_at' => now()]);

        return $pdi;
    }

    public function checkItem(PdiChecklistItem $item, string $status, ?string $note, User $by): PdiChecklistItem
    {
        $pdi = $item->inspection;
        if (in_array($pdi->status, [PdiStatus::Passed, PdiStatus::Failed], true) && $pdi->delivered_at) {
            throw new CheckoutException('Inspection is closed.', 'pdi_closed');
        }
        if ($status === 'fail' && blank($note)) {
            throw new CheckoutException('A note is required for a failed item.', 'pdi_note_required');
        }

        if ($pdi->status === PdiStatus::Pending) {
            $this->start($pdi, $by);
        }

        $item->update(['status' => $status, 'note' => $note, 'checked_by' => $by->id, 'checked_at' => now()]);

        // Re-opening a finished inspection (a failed item was fixed and re-checked).
        if (in_array($pdi->status, [PdiStatus::Passed, PdiStatus::Failed], true)) {
            $pdi->update(['status' => PdiStatus::InProgress, 'completed_at' => null]);
        }

        return $item;
    }

    /** Every item must be checked; any "fail" means Failed (fix it, re-check, complete again). */
    public function complete(PdiInspection $pdi): PdiInspection
    {
        $progress = $pdi->progress();
        if ($progress['done'] < $progress['total']) {
            throw new CheckoutException('Some checklist items are still pending.', 'pdi_incomplete');
        }

        $pdi->update([
            'status' => $progress['failed'] > 0 ? PdiStatus::Failed : PdiStatus::Passed,
            'completed_at' => now(),
        ]);

        return $pdi;
    }

    /**
     * Car handed over. Closes the order, marks the car sold and adds it to the customer's
     * fleet in the CRM so maintenance and battery reports attach to it from now on.
     */
    public function markDelivered(PdiInspection $pdi): PdiInspection
    {
        if ($pdi->status !== PdiStatus::Passed) {
            throw new CheckoutException('Only a passed inspection can be delivered.', 'pdi_not_passed');
        }

        return DB::transaction(function () use ($pdi) {
            $pdi->update(['delivered_at' => now()]);
            $pdi->order->update(['status' => OrderStatus::Fulfilled]);

            $vehicle = $pdi->vehicle;
            $vehicle->update(['status' => VehicleStatus::Sold, 'sold_at' => now()]);

            if ($pdi->order->user_id) {
                CustomerVehicle::firstOrCreate(
                    ['vehicle_id' => $vehicle->id, 'user_id' => $pdi->order->user_id],
                    [
                        'vin' => $vehicle->vin,
                        'make' => 'BYD',
                        'model' => $vehicle->getTranslation('name', 'en', false) ?: 'BYD',
                        'model_year' => $vehicle->model_year,
                        'color' => $vehicle->exterior_color,
                        'purchased_at' => now()->toDateString(),
                        'warranty_until' => now()->addYears((int) config('awm.warranty_years', 6))->toDateString(),
                    ],
                );
            }

            return $pdi;
        });
    }
}
