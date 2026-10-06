<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\JobCardStatus;
use App\Http\Controllers\Controller;
use App\Models\CustomerVehicle;
use App\Models\JobCard;
use App\Models\JobCardPart;
use App\Models\SparePart;
use App\Models\User;
use App\Services\Checkout\CheckoutException;
use App\Services\Inventory\InsufficientStockException;
use App\Services\Inventory\JobCardService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Maintenance kanban. Staff with job_cards.manage see and assign everything;
 * technicians (job_cards.work only) see and work on their own cards.
 */
class JobCardAdminController extends Controller
{
    public function __construct(private JobCardService $cards) {}

    /** GET /admin/job-cards?branch=&technician_id=&q=  -> kanban columns */
    public function index(Request $request)
    {
        $locale = app()->getLocale();
        $cards = $this->scoped($request)
            ->with(['customer:id,name,phone', 'customerVehicle', 'technician:id,name'])
            ->when($request->query('branch'), fn ($q, $b) => $q->where('branch', $b))
            ->when($request->query('technician_id'), fn ($q, $t) => $q->where('technician_id', $t))
            ->when($request->query('q'), function ($q, $term) {
                $like = '%' . addcslashes($term, '%_\\') . '%';
                $q->where(fn ($w) => $w->where('number', 'like', $like)
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', $like)->orWhere('phone', 'like', $like))
                    ->orWhereHas('customerVehicle', fn ($v) => $v->where('plate_number', 'like', $like)->orWhere('vin', 'like', $like)));
            })
            // Completed column shows the last 7 days only.
            ->where(fn ($q) => $q->where('status', '!=', JobCardStatus::Completed->value)->orWhere('completed_at', '>=', now()->subDays(7)))
            ->orderByRaw('scheduled_at IS NULL, scheduled_at')->latest('id')
            ->limit(500)->get();

        return [
            'columns' => collect(JobCardStatus::cases())->map(fn ($s) => [
                'status' => $s->value,
                'label' => $s->label($locale),
                'cards' => $cards->where('status', $s)->values()->map(fn ($c) => $this->card($c, $locale)),
            ]),
        ];
    }

    public function show(Request $request, JobCard $jobCard)
    {
        $this->authorizeCard($request, $jobCard);
        $jobCard->load(['customer', 'customerVehicle', 'technician:id,name', 'parts.part', 'invoice.payments']);
        $locale = app()->getLocale();

        return $this->card($jobCard, $locale) + [
            'diagnosis' => $jobCard->diagnosis,
            'work_done' => $jobCard->work_done,
            'started_at' => $jobCard->started_at?->toAtomString(),
            'completed_at' => $jobCard->completed_at?->toAtomString(),
            'parts' => $jobCard->parts->map(fn (JobCardPart $l) => [
                'id' => $l->id,
                'spare_part_id' => $l->spare_part_id,
                'sku' => $l->part?->sku,
                'name' => $l->part?->getTranslation('name', $locale),
                'quantity' => $l->quantity,
                'unit_price' => (string) $l->unit_price,
                'line_total' => bcmul((string) $l->unit_price, (string) $l->quantity, 2),
            ]),
            'invoice' => $jobCard->invoice ? [
                'id' => $jobCard->invoice->id,
                'number' => $jobCard->invoice->number,
                'status' => $jobCard->invoice->status,
                'total' => (string) $jobCard->invoice->total,
                'balance' => $jobCard->invoice->balance(),
                'currency' => $jobCard->invoice->currency,
            ] : null,
        ];
    }

    /** POST /admin/job-cards (job_cards.manage) */
    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['required', 'exists:users,id'],
            'customer_vehicle_id' => ['required', Rule::exists('customer_vehicles', 'id')->where('user_id', $request->input('customer_id'))],
            'branch' => ['required', Rule::in(array_keys(config('awm.branches')))],
            'service_type' => ['required', 'in:maintenance,repair,diagnostics,warranty,inspection'],
            'complaint' => ['nullable', 'string', 'max:2000'],
            'mileage_in_km' => ['nullable', 'integer', 'min:0'],
            'technician_id' => ['nullable', $this->technicianRule()],
            'scheduled_at' => ['nullable', 'date'],
        ]);

        $card = JobCard::create($data + ['status' => JobCardStatus::Pending, 'created_by' => $request->user()->id]);
        $this->bumpMileage($card);

        return response()->json($this->card($card->load('customer', 'customerVehicle', 'technician'), app()->getLocale()), 201);
    }

    /** PUT /admin/job-cards/{jobCard}: notes, mileage, column moves (not "completed": use complete). */
    public function update(Request $request, JobCard $jobCard)
    {
        $this->authorizeCard($request, $jobCard);
        if ($jobCard->status === JobCardStatus::Completed) {
            throw new CheckoutException('Completed job cards are locked.', 'job_card_closed');
        }

        $rules = [
            'status' => ['sometimes', 'in:pending,in_progress,waiting_parts'],
            'diagnosis' => ['nullable', 'string', 'max:5000'],
            'work_done' => ['nullable', 'string', 'max:5000'],
            'mileage_in_km' => ['nullable', 'integer', 'min:0'],
            'scheduled_at' => ['nullable', 'date'],
        ];
        if ($request->user()->can('job_cards.manage')) {
            $rules += [
                'technician_id' => ['nullable', $this->technicianRule()],
                'branch' => ['nullable', Rule::in(array_keys(config('awm.branches')))],
                'complaint' => ['nullable', 'string', 'max:2000'],
            ];
        }

        $jobCard->update($request->validate($rules));
        $this->bumpMileage($jobCard);

        return $this->card($jobCard->fresh(['customer', 'customerVehicle', 'technician']), app()->getLocale());
    }

    /** POST /admin/job-cards/{jobCard}/parts {spare_part_id, quantity}: deducts stock immediately. */
    public function usePart(Request $request, JobCard $jobCard)
    {
        $this->authorizeCard($request, $jobCard);
        $data = $request->validate([
            'spare_part_id' => ['required', 'exists:spare_parts,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:999'],
        ]);

        try {
            $line = $this->cards->usePart($jobCard, SparePart::findOrFail($data['spare_part_id']), $data['quantity'], $request->user()->id);
        } catch (InsufficientStockException $e) {
            // The service already moved the card to "waiting for parts".
            throw new CheckoutException($e->getMessage(), 'insufficient_stock');
        }

        return response()->json(['id' => $line->id, 'status' => $jobCard->fresh()->status->value], 201);
    }

    /** DELETE /admin/job-cards/{jobCard}/parts/{line}: returns the units to stock. */
    public function returnPart(Request $request, JobCard $jobCard, JobCardPart $line)
    {
        $this->authorizeCard($request, $jobCard);
        abort_unless($line->job_card_id === $jobCard->id, 404);
        $this->cards->returnPart($line, $request->user()->id);

        return response()->noContent();
    }

    /** POST /admin/job-cards/{jobCard}/complete {labor_total, currency}: issues the invoice. */
    public function complete(Request $request, JobCard $jobCard)
    {
        $this->authorizeCard($request, $jobCard);
        $data = $request->validate([
            'labor_total' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'in:USD,SYP'],
            'work_done' => ['nullable', 'string', 'max:5000'],
        ]);
        if (! empty($data['work_done'])) {
            $jobCard->update(['work_done' => $data['work_done']]);
        }

        $invoice = $this->cards->complete($jobCard, number_format((float) $data['labor_total'], 2, '.', ''), $data['currency'] ?? config('awm.default_currency'));

        return response()->json(['invoice_id' => $invoice->id, 'invoice_number' => $invoice->number, 'total' => (string) $invoice->total], 201);
    }

    /** GET /admin/technicians: for the assign dropdown. */
    public function technicians()
    {
        return User::role('technician')->where('is_active', true)->orderBy('name')->get(['id', 'name']);
    }

    private function scoped(Request $request)
    {
        return JobCard::query()->when(
            ! $request->user()->can('job_cards.manage'),
            fn ($q) => $q->where('technician_id', $request->user()->id),
        );
    }

    private function authorizeCard(Request $request, JobCard $card): void
    {
        abort_unless($request->user()->can('job_cards.manage') || $card->technician_id === $request->user()->id, 403);
    }

    private function technicianRule()
    {
        return Rule::exists('users', 'id')->where(fn ($q) => $q->whereIn('id', User::role('technician')->select('id')));
    }

    private function bumpMileage(JobCard $card): void
    {
        if ($card->mileage_in_km) {
            CustomerVehicle::whereKey($card->customer_vehicle_id)
                ->where(fn ($q) => $q->whereNull('last_mileage_km')->orWhere('last_mileage_km', '<', $card->mileage_in_km))
                ->update(['last_mileage_km' => $card->mileage_in_km]);
        }
    }

    private function card(JobCard $c, string $locale): array
    {
        $v = $c->customerVehicle;

        return [
            'id' => $c->id,
            'number' => $c->number,
            'status' => $c->status->value,
            'service_type' => $c->service_type,
            'branch' => $c->branch,
            'customer' => $c->customer?->only(['id', 'name', 'phone']),
            'vehicle' => $v ? ['id' => $v->id, 'label' => trim("{$v->make} {$v->model} {$v->model_year}"), 'plate_number' => $v->plate_number, 'vin' => $v->vin] : null,
            'technician' => $c->technician?->only(['id', 'name']),
            'complaint' => $c->complaint,
            'mileage_in_km' => $c->mileage_in_km,
            'scheduled_at' => $c->scheduled_at?->toAtomString(),
            'created_at' => $c->created_at?->toAtomString(),
        ];
    }
}
