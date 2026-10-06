<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\JobCardStatus;
use App\Http\Controllers\Controller;
use App\Models\JobCard;
use App\Models\User;
use App\Services\Inventory\JobCardService;
use Illuminate\Http\Request;

/**
 * Workshop board. Technicians (job_cards.work) move cards along and complete them;
 * assigning a technician needs job_cards.manage.
 */
class JobCardAdminController extends Controller
{
    /** What each status may do next. The board shows exactly these buttons. */
    private const ACTIONS = [
        'pending' => ['start', 'wait_parts'],
        'in_progress' => ['wait_parts', 'complete'],
        'waiting_parts' => ['resume'],
        'completed' => [],
    ];

    public function __construct(private JobCardService $cards) {}

    /** GET /admin/job-cards?branch=sahnaya&mine=1  (open cards + cards completed in the last 7 days) */
    public function index(Request $request)
    {
        $data = $request->validate([
            'branch' => ['nullable', 'string', 'max:30'],
            'mine' => ['nullable', 'boolean'],
        ]);

        $cards = JobCard::with(['customer:id,name,phone', 'customerVehicle', 'technician:id,name', 'invoice'])
            ->when($data['branch'] ?? null, fn ($q, $b) => $q->where('branch', $b))
            ->when($request->boolean('mine'), fn ($q) => $q->where('technician_id', $request->user()->id))
            ->where(fn ($q) => $q->where('status', '!=', JobCardStatus::Completed->value)
                ->orWhere('completed_at', '>=', now()->subDays(7)))
            ->orderByRaw('scheduled_at IS NULL')
            ->orderBy('scheduled_at')
            ->orderBy('id')
            ->limit(300)
            ->get();

        return [
            'data' => $cards->map(fn (JobCard $c) => $this->cardArray($c))->values(),
            'can_assign' => $request->user()->can('job_cards.manage'),
        ];
    }

    /** GET /admin/technicians: for the "assign" dropdown. */
    public function technicians()
    {
        return User::role('technician')->where('is_active', true)->orderBy('name')->get(['id', 'name']);
    }

    /** PUT /admin/job-cards/{card}/status  {status: in_progress|waiting_parts} */
    public function status(Request $request, JobCard $card)
    {
        $data = $request->validate(['status' => ['required', 'in:in_progress,waiting_parts']]);

        abort_if($card->status === JobCardStatus::Completed, 422, 'A completed job card cannot be changed.');
        abort_if($card->status->value === $data['status'], 422, 'The job card is already in that status.');

        $card->update(['status' => $data['status']]);

        return $this->cardArray($card->fresh(['customer:id,name,phone', 'customerVehicle', 'technician:id,name', 'invoice']));
    }

    /** POST /admin/job-cards/{card}/complete  {labor_total, currency}: closes the job and issues the invoice. */
    public function complete(Request $request, JobCard $card)
    {
        $data = $request->validate([
            'labor_total' => ['required', 'numeric', 'min:0', 'max:99999999'],
            'currency' => ['required', 'in:USD,SYP'],
        ]);

        abort_if($card->status === JobCardStatus::Completed, 422, 'This job card is already completed.');

        $this->cards->complete($card, number_format((float) $data['labor_total'], 2, '.', ''), $data['currency']);

        return $this->cardArray($card->fresh(['customer:id,name,phone', 'customerVehicle', 'technician:id,name', 'invoice']));
    }

    /** PUT /admin/job-cards/{card}/technician  {technician_id|null}  (job_cards.manage) */
    public function assign(Request $request, JobCard $card)
    {
        $data = $request->validate(['technician_id' => ['nullable', 'integer', 'exists:users,id']]);

        if ($data['technician_id'] ?? null) {
            abort_unless(
                User::role(['technician', 'admin'])->whereKey($data['technician_id'])->exists(),
                422, 'That user is not a technician.',
            );
        }
        $card->update(['technician_id' => $data['technician_id'] ?? null]);

        return $this->cardArray($card->fresh(['customer:id,name,phone', 'customerVehicle', 'technician:id,name', 'invoice']));
    }

    private function cardArray(JobCard $c): array
    {
        $locale = app()->getLocale();
        $v = $c->customerVehicle;

        return [
            'id' => $c->id,
            'number' => $c->number,
            'status' => ['code' => $c->status->value, 'label' => $c->status->label($locale)],
            'actions' => self::ACTIONS[$c->status->value] ?? [],
            'service_type' => $c->service_type,
            'branch' => $c->branch,
            'complaint' => $c->complaint,
            'work_done' => $c->work_done,
            'mileage_in_km' => $c->mileage_in_km,
            'scheduled_at' => $c->scheduled_at?->toAtomString(),
            'started_at' => $c->started_at?->toAtomString(),
            'completed_at' => $c->completed_at?->toAtomString(),
            'customer' => $c->customer ? ['id' => $c->customer->id, 'name' => $c->customer->name, 'phone' => $c->customer->phone] : null,
            'vehicle' => $v ? [
                'label' => trim("{$v->make} {$v->model} {$v->model_year}"),
                'plate_number' => $v->plate_number,
                'vin' => $v->vin,
            ] : null,
            'technician' => $c->technician ? ['id' => $c->technician->id, 'name' => $c->technician->name] : null,
            'invoice' => $c->invoice ? [
                'number' => $c->invoice->number,
                'status' => $c->invoice->status,
                'total' => (string) $c->invoice->total,
                'currency' => $c->invoice->currency,
            ] : null,
        ];
    }
}
