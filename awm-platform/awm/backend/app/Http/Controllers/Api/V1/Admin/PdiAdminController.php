<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\PdiChecklistItem;
use App\Models\PdiInspection;
use App\Services\Pdi\PdiService;
use Illuminate\Http\Request;

class PdiAdminController extends Controller
{
    public function __construct(private PdiService $pdi) {}

    /**
     * GET /admin/pdi?stage=pending|in_progress|failed|handover|delivered&q=
     * `handover` = passed and waiting to be handed over; `delivered` = already handed over.
     */
    public function index(Request $request)
    {
        $data = $request->validate([
            'stage' => ['nullable', 'in:pending,in_progress,failed,handover,delivered'],
            'status' => ['nullable', 'in:pending,in_progress,passed,failed'],
            'q' => ['nullable', 'string', 'max:60'],
        ]);
        $q = $data['q'] ?? null;
        $stage = $data['stage'] ?? null;

        return PdiInspection::with(['order:id,number,customer,user_id', 'vehicle', 'technician:id,name', 'items'])
            ->when($data['status'] ?? null, fn ($query, $s) => $query->where('status', $s))
            ->when(in_array($stage, ['pending', 'in_progress', 'failed'], true), fn ($query) => $query->where('status', $stage)->whereNull('delivered_at'))
            ->when($stage === 'handover', fn ($query) => $query->where('status', 'passed')->whereNull('delivered_at'))
            ->when($stage === 'delivered', fn ($query) => $query->whereNotNull('delivered_at'))
            ->when($q, fn ($query) => $query->whereHas('order', fn ($o) => $o
                ->where('number', 'like', "%{$q}%")
                ->orWhere('customer->name', 'like', "%{$q}%")
                ->orWhere('customer->phone', 'like', "%{$q}%")))
            ->latest()->paginate(25)
            ->through(fn (PdiInspection $p) => $this->summary($p));
    }
    /** GET /admin/pdi/{pdi} */
    public function show(PdiInspection $pdi)
    {
        $pdi->load(['items.checker:id,name', 'order', 'vehicle', 'technician:id,name']);
        $locale = app()->getLocale();

        return $this->summary($pdi) + [
            'notes' => $pdi->notes,
            'customer_note' => $pdi->getTranslations('customer_note'),
            'items' => $pdi->items->map(fn ($i) => [
                'id' => $i->id,
                'section' => $i->section,
                'code' => $i->code,
                'label' => $i->getTranslations('label'),
                'status' => $i->status,
                'note' => $i->note,
                'checked_by' => $i->checker?->name,
                'checked_at' => $i->checked_at?->toAtomString(),
            ]),
        ];
    }

    /** POST /admin/pdi/{pdi}/start */
    public function start(Request $request, PdiInspection $pdi)
    {
        return $this->summary($this->pdi->start($pdi, $request->user()));
    }

    /** PUT /admin/pdi/items/{item}  {status: pass|fail|na|pending, note} */
    public function checkItem(Request $request, PdiChecklistItem $item)
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,pass,fail,na'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $item = $this->pdi->checkItem($item, $data['status'], $data['note'] ?? null, $request->user());

        return ['id' => $item->id, 'status' => $item->status, 'progress' => $item->inspection->progress()];
    }

    /** POST /admin/pdi/{pdi}/complete */
    public function complete(PdiInspection $pdi)
    {
        return $this->summary($this->pdi->complete($pdi));
    }

    /** POST /admin/pdi/{pdi}/deliver */
    public function deliver(PdiInspection $pdi)
    {
        return $this->summary($this->pdi->markDelivered($pdi));
    }

    /** PUT /admin/pdi/{pdi}  ETA + notes */
    public function update(Request $request, PdiInspection $pdi)
    {
        $data = $request->validate([
            'technician_id' => ['nullable', 'exists:users,id'],
            'estimated_delivery_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'customer_note' => ['nullable', 'array'],
            'customer_note.*' => ['nullable', 'string', 'max:500'],
        ]);
        $pdi->update($data);

        return $this->summary($pdi->fresh());
    }

    private function summary(PdiInspection $p): array
    {
        return [
            'id' => $p->id,
            'order_number' => $p->order?->number,
            'has_account' => (bool) $p->order?->user_id,
            'customer' => $p->order?->customer,
            'vehicle' => ['id' => $p->vehicle?->id, 'name' => $p->vehicle?->getTranslation('name', app()->getLocale()), 'vin' => $p->vehicle?->vin],
            'status' => $p->status->value,
            'technician' => $p->technician?->name,
            'progress' => $p->progress(),
            'estimated_delivery_at' => $p->estimated_delivery_at?->toAtomString(),
            'completed_at' => $p->completed_at?->toAtomString(),
            'delivered_at' => $p->delivered_at?->toAtomString(),
            'delivered' => $p->delivered_at !== null,
        ];
    }
}
