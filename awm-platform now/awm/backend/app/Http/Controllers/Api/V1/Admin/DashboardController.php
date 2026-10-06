<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\JobCardStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\PdiStatus;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\JobCard;
use App\Models\MaintenanceInvoice;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PdiInspection;
use App\Models\SparePart;
use App\Models\Vehicle;
use Illuminate\Support\Facades\DB;

/** GET /admin/dashboard: KPIs for the admin home screen. */
class DashboardController extends Controller
{
    public function __invoke()
    {
        $today = now()->startOfDay();
        $month = now()->startOfMonth();
        $locale = app()->getLocale();

        $paid = fn () => Order::whereNotNull('paid_at')
            ->whereNotIn('status', [OrderStatus::Cancelled->value, OrderStatus::Refunded->value]);

        $salesSince = fn ($from) => $paid()->where('paid_at', '>=', $from)
            ->selectRaw('currency, flow, COUNT(*) as orders, SUM(grand_total) as total')
            ->groupBy('currency', 'flow')->get()
            ->map(fn ($r) => ['currency' => $r->currency, 'flow' => $r->flow->value, 'orders' => (int) $r->orders, 'total' => (string) $r->total]);

        $jobCards = JobCard::open()->selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status');

        return [
            'generated_at' => now()->toAtomString(),

            'sales' => [
                'today' => $salesSince($today),
                'month' => $salesSince($month),
                // Daily paid totals, last 30 days, for the chart.
                'daily' => $paid()->where('paid_at', '>=', now()->subDays(29)->startOfDay())
                    ->selectRaw('DATE(paid_at) as day, currency, SUM(grand_total) as total')
                    ->groupBy('day', 'currency')->orderBy('day')->get()
                    ->map(fn ($r) => ['day' => $r->day, 'currency' => $r->currency, 'total' => (string) $r->total]),
            ],

            'maintenance' => [
                'open_by_status' => collect(JobCardStatus::cases())
                    ->reject(fn ($s) => $s === JobCardStatus::Completed)
                    ->mapWithKeys(fn ($s) => [$s->value => (int) ($jobCards[$s->value] ?? 0)]),
                'completed_today' => JobCard::where('status', JobCardStatus::Completed->value)->where('completed_at', '>=', $today)->count(),
                'appointments_today' => Appointment::occupying()->whereBetween('starts_at', [$today, $today->copy()->endOfDay()])->count(),
                'appointments_requested' => Appointment::where('status', 'requested')->where('starts_at', '>=', now())->count(),
                'pdi_open' => PdiInspection::whereIn('status', [PdiStatus::Pending->value, PdiStatus::InProgress->value])->count(),
            ],

            'inventory' => [
                'low_stock_count' => SparePart::lowStock()->count(),
                'low_stock' => SparePart::lowStock()
                    ->orderByRaw('(stock_quantity - reserved_quantity) asc')->limit(10)->get()
                    ->map(fn (SparePart $p) => [
                        'id' => $p->id,
                        'sku' => $p->sku,
                        'name' => $p->getTranslation('name', $locale),
                        'available' => $p->availableQuantity(),
                        'threshold' => $p->low_stock_threshold,
                    ]),
            ],

            'vehicles' => Vehicle::selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status'),

            'finance' => [
                'payments_awaiting_confirmation' => Payment::where('status', PaymentStatus::AwaitingConfirmation->value)->count(),
                'overdue_invoices' => MaintenanceInvoice::whereIn('status', ['unpaid', 'partially_paid'])->where('due_at', '<', now())->count(),
                'outstanding' => MaintenanceInvoice::whereIn('status', ['unpaid', 'partially_paid'])
                    ->groupBy('currency')->select('currency', DB::raw('SUM(total - paid_amount) as amount'))->get()
                    ->map(fn ($r) => ['currency' => $r->currency, 'amount' => (string) $r->amount]),
            ],
        ];
    }
}
