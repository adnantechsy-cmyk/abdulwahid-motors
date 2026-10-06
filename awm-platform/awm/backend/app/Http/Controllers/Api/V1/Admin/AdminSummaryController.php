<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\JobCardStatus;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ContactMessage;
use App\Models\JobCard;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PdiInspection;
use App\Models\SparePart;
use Illuminate\Http\Request;

/** Counters for the admin overview. A counter is only included if the staff member can open that section. */
class AdminSummaryController extends Controller
{
    /** GET /admin/summary */
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $out = [];

        if ($user->can('payments.confirm')) {
            $out['payments_awaiting'] = Payment::where('status', 'awaiting_confirmation')->count();
        }

        if ($user->can('job_cards.work') || $user->can('job_cards.manage')) {
            $out['job_cards'] = collect(JobCardStatus::cases())
                ->mapWithKeys(fn (JobCardStatus $s) => [$s->value => JobCard::where('status', $s->value)->count()])
                ->all();
        }

        if ($user->can('orders.manage')) {
            $out['orders_unpaid'] = Order::whereIn('status', ['pending', 'awaiting_payment', 'failed'])->count();
            $out['orders_to_fulfil'] = Order::whereIn('status', ['paid', 'processing'])->where('flow', '!=', 'vehicle_reservation')->count();
        }

        if ($user->can('parts.manage') || $user->can('stock.adjust')) {
            $out['parts_low_stock'] = SparePart::where('is_published', true)->lowStock()->count();
        }

        if ($user->can('customers.manage')) {
            $out['contact_open'] = ContactMessage::whereNull('handled_at')->count();
        }

        if ($user->can('pdi.manage')) {
            $open = PdiInspection::whereNull('delivered_at');
            $out['pdi_open'] = (clone $open)->whereIn('status', ['pending', 'in_progress', 'failed'])->count();
            $out['pdi_handover'] = (clone $open)->where('status', 'passed')->count();
        }

        if ($user->can('appointments.manage')) {
            $out['appointments_requested'] = Appointment::where('status', 'requested')->where('starts_at', '>=', now())->count();
            $out['appointments_today'] = Appointment::occupying()->whereDate('starts_at', now()->toDateString())->count();
        }

        return $out;
    }
}
