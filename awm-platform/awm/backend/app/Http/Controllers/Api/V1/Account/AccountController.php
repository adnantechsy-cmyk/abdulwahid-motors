<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Enums\CartFlow;
use App\Enums\JobCardStatus;
use App\Enums\OrderStatus;
use App\Enums\PdiStatus;
use App\Http\Controllers\Controller;
use App\Models\BatteryInspection;
use App\Models\Order;
use App\Models\PdiInspection;
use Illuminate\Http\Request;

/** Customer area (Figma 1:4173 dashboard, 1:1300 order tracking, 1:4791 vehicle details). */
class AccountController extends Controller
{
    /** GET /api/v1/account/summary */
    public function summary(Request $request)
    {
        $u = $request->user();

        return [
            'vehicles' => $u->ownedVehicles()->count(),
            'open_job_cards' => $u->jobCards()->where('status', '!=', JobCardStatus::Completed->value)->count(),
            'unpaid_invoices' => $u->invoices()->whereIn('status', ['unpaid', 'partially_paid'])->count(),
            'upcoming_appointments' => $u->appointments()->occupying()->where('starts_at', '>=', now())->count(),
            'active_orders' => $u->orders()->whereNotIn('status', [OrderStatus::Fulfilled->value, OrderStatus::Cancelled->value, OrderStatus::Refunded->value])->count(),
        ];
    }

    /** GET /api/v1/account/orders */
    public function orders(Request $request)
    {
        return $request->user()->orders()->latest('id')->paginate(15)->through(fn (Order $o) => [
            'number' => $o->number,
            'flow' => $o->flow->value,
            'status' => $o->status->value,
            'grand_total' => (string) $o->grand_total,
            'currency' => $o->currency,
            'placed_at' => $o->placed_at?->toAtomString(),
        ]);
    }

    /** GET /api/v1/account/orders/{number}: order detail + delivery tracking for car reservations. */
    public function order(Request $request, string $number)
    {
        $locale = app()->getLocale();
        $order = $request->user()->orders()->where('number', $number)
            ->with(['items', 'payments.gateway', 'pdi.items', 'pdi.vehicle'])->firstOrFail();

        return [
            'number' => $order->number,
            'flow' => $order->flow->value,
            'status' => $order->status->value,
            'currency' => $order->currency,
            'grand_total' => (string) $order->grand_total,
            'placed_at' => $order->placed_at?->toAtomString(),
            'paid_at' => $order->paid_at?->toAtomString(),
            'branch_pickup' => $order->branch_pickup,
            'items' => $order->items->map(fn ($i) => [
                'name' => $i->name[$locale] ?? $i->name['en'] ?? '',
                'sku' => $i->sku,
                'quantity' => $i->quantity,
                'unit_price' => (string) $i->unit_price,
                'line_total' => (string) $i->line_total,
                'image' => $i->snapshot['image'] ?? null,
            ]),
            'payments' => $order->payments->map(fn ($p) => [
                'id' => $p->uuid,
                'method' => $p->gateway?->getTranslation('name', $locale),
                'status' => $p->status->value,
                'amount' => (string) $p->amount,
                'created_at' => $p->created_at->toAtomString(),
            ]),
            'tracking' => $order->flow === CartFlow::VehicleReservation ? $this->tracking($order, $order->pdi, $locale) : null,
        ];
    }

    /** GET /api/v1/account/vehicles */
    public function vehicles(Request $request)
    {
        $locale = app()->getLocale();

        return $request->user()->ownedVehicles()
            ->with(['batteryInspections' => fn ($q) => $q->limit(1), 'vehicle'])
            ->get()
            ->map(fn ($v) => $this->vehicleArray($v, $locale) + [
                'latest_battery_report' => ($r = $v->batteryInspections->first()) ? [
                    'certificate_number' => $r->certificate_number,
                    'state_of_health_pct' => (string) $r->state_of_health_pct,
                    'result' => $r->result->value,
                    'inspected_at' => $r->inspected_at->toAtomString(),
                ] : null,
                'next_appointment' => $v->appointments()->occupying()->where('starts_at', '>=', now())->orderBy('starts_at')->first()?->toCustomerArray(),
            ]);
    }

    /** GET /api/v1/account/vehicles/{id}: service history, battery reports, appointments. */
    public function vehicle(Request $request, int $id)
    {
        $locale = app()->getLocale();
        $v = $request->user()->ownedVehicles()->with(['jobCards.invoice', 'batteryInspections', 'appointments', 'vehicle'])->findOrFail($id);

        return $this->vehicleArray($v, $locale) + [
            'service_history' => $v->jobCards->sortByDesc('created_at')->values()->map(fn ($c) => [
                'number' => $c->number,
                'service_type' => $c->service_type,
                'status' => ['code' => $c->status->value, 'label' => $c->status->label($locale)],
                'branch' => $c->branch,
                'mileage_in_km' => $c->mileage_in_km,
                'complaint' => $c->complaint,
                'work_done' => $c->work_done,
                'opened_at' => $c->created_at->toAtomString(),
                'completed_at' => $c->completed_at?->toAtomString(),
                'invoice' => $c->invoice ? [
                    'id' => $c->invoice->id,                 // add to cart as {type: maintenance_invoice, id}
                    'number' => $c->invoice->number,
                    'status' => $c->invoice->status,
                    'total' => (string) $c->invoice->total,
                    'balance' => $c->invoice->balance(),
                    'currency' => $c->invoice->currency,
                ] : null,
            ]),
            'battery_reports' => $v->batteryInspections->map(fn ($r) => [
                'certificate_number' => $r->certificate_number,
                'inspected_at' => $r->inspected_at->toAtomString(),
                'state_of_health_pct' => (string) $r->state_of_health_pct,
                'result' => ['code' => $r->result->value, 'label' => $r->result->label($locale)],
                'is_valid' => $r->isValid(),
            ]),
            'appointments' => $v->appointments->sortByDesc('starts_at')->values()->map->toCustomerArray(),
        ];
    }

    /** GET /api/v1/account/invoices */
    public function invoices(Request $request)
    {
        return $request->user()->invoices()->with('jobCard:id,number')->latest('issued_at')->paginate(20)->through(fn ($i) => [
            'id' => $i->id,
            'number' => $i->number,
            'job_card' => $i->jobCard?->number,
            'status' => $i->status,
            'currency' => $i->currency,
            'total' => (string) $i->total,
            'paid_amount' => (string) $i->paid_amount,
            'balance' => $i->balance(),
            'issued_at' => $i->issued_at?->toAtomString(),
            'due_at' => $i->due_at?->toAtomString(),
            'payable' => $i->cartAvailableQuantity() > 0,
        ]);
    }

    /** GET /api/v1/account/battery-reports/{certificate} */
    public function batteryReport(Request $request, string $certificate)
    {
        $report = BatteryInspection::where('certificate_number', $certificate)
            ->whereHas('customerVehicle', fn ($q) => $q->where('user_id', $request->user()->id))
            ->with(['customerVehicle', 'technician'])->firstOrFail();

        return $report->toReportArray(app()->getLocale());
    }

    private function vehicleArray($v, string $locale): array
    {
        return [
            'id' => $v->id,
            'make' => $v->make,
            'model' => $v->model,
            'model_year' => $v->model_year,
            'vin' => $v->vin,
            'plate_number' => $v->plate_number,
            'color' => $v->color,
            'last_mileage_km' => $v->last_mileage_km,
            'purchased_at' => $v->purchased_at?->toDateString(),
            'warranty_until' => $v->warranty_until?->toDateString(),
            'under_warranty' => $v->isUnderWarranty(),
            'image' => $v->vehicle?->coverUrl(),
        ];
    }

    /** Ordered delivery steps for the tracking page. done | current | upcoming per step. */
    private function tracking(Order $order, ?PdiInspection $pdi, string $locale): array
    {
        $ar = $locale === 'ar';
        $paid = $order->paid_at !== null;
        $pdiStarted = $pdi && $pdi->status !== PdiStatus::Pending;
        $pdiPassed = $pdi?->status === PdiStatus::Passed;
        $delivered = (bool) $pdi?->delivered_at;

        $steps = [
            ['code' => 'reserved', 'label' => $ar ? 'تم الحجز' : 'Reserved', 'done' => true, 'at' => $order->placed_at?->toAtomString()],
            ['code' => 'deposit_paid', 'label' => $ar ? 'تم استلام الدفعة' : 'Deposit received', 'done' => $paid, 'at' => $order->paid_at?->toAtomString()],
            ['code' => 'pdi', 'label' => $ar ? 'الفحص قبل التسليم' : 'Pre-delivery inspection', 'done' => $pdiPassed, 'at' => $pdi?->completed_at?->toAtomString()],
            ['code' => 'ready', 'label' => $ar ? 'جاهزة للتسليم' : 'Ready for handover', 'done' => $pdiPassed, 'at' => $pdi?->completed_at?->toAtomString()],
            ['code' => 'delivered', 'label' => $ar ? 'تم التسليم' : 'Delivered', 'done' => $delivered, 'at' => $pdi?->delivered_at?->toAtomString()],
        ];

        $current = collect($steps)->search(fn ($s) => ! $s['done']);
        foreach ($steps as $i => &$s) {
            $s['state'] = $s['done'] ? 'done' : ($i === $current ? 'current' : 'upcoming');
            unset($s['done']);
        }
        unset($s);

        return [
            'steps' => $steps,
            'estimated_delivery_at' => $pdi?->estimated_delivery_at?->toAtomString(),
            'customer_note' => $pdi?->getTranslation('customer_note', $locale) ?: null,
            'pdi' => $pdi ? [
                'status' => ['code' => $pdi->status->value, 'label' => $pdi->status->label($locale)],
                'started' => $pdiStarted,
                'progress' => $pdi->progress(),
                // Customers see the checklist grouped by section, without staff notes.
                'sections' => $pdi->items->groupBy('section')->map(fn ($items, $section) => [
                    'section' => $section,
                    'items' => $items->map(fn ($it) => ['label' => $it->getTranslation('label', $locale), 'status' => $it->status])->values(),
                ])->values(),
            ] : null,
        ];
    }
}
