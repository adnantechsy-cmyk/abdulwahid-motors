<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\JobCardStatus;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\JobCard;
use App\Models\Payment;
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

        if ($user->can('appointments.manage')) {
            $out['appointments_requested'] = Appointment::where('status', 'requested')->where('starts_at', '>=', now())->count();
            $out['appointments_today'] = Appointment::occupying()->whereDate('starts_at', now()->toDateString())->count();
        }

        return $out;
    }
}
