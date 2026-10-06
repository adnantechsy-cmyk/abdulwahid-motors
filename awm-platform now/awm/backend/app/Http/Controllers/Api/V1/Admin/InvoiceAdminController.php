<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceInvoice;
use App\Services\Checkout\CheckoutException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Billing & collection (Figma 1:21010). */
class InvoiceAdminController extends Controller
{
    /** GET /admin/invoices?status=unpaid|partially_paid|paid|void|overdue&q= */
    public function index(Request $request)
    {
        $status = $request->query('status');

        $page = MaintenanceInvoice::with(['customer:id,name,phone', 'jobCard:id,number'])
            ->when($status === 'overdue', fn ($q) => $q->whereIn('status', ['unpaid', 'partially_paid'])->where('due_at', '<', now()))
            ->when($status && $status !== 'overdue', fn ($q) => $q->where('status', $status))
            ->when($request->query('q'), function ($q, $term) {
                $like = '%' . addcslashes($term, '%_\\') . '%';
                $q->where(fn ($w) => $w->where('number', 'like', $like)
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', $like)->orWhere('phone', 'like', $like)));
            })
            ->latest('issued_at')->paginate(30);

        return [
            'outstanding' => MaintenanceInvoice::whereIn('status', ['unpaid', 'partially_paid'])->groupBy('currency')
                ->select('currency', DB::raw('SUM(total - paid_amount) as amount'), DB::raw('COUNT(*) as invoices'))->get(),
            'collected_today' => \App\Models\InvoicePayment::where('received_at', '>=', now()->startOfDay())->groupBy('currency')
                ->select('currency', DB::raw('SUM(amount) as amount'))->get(),
            'data' => collect($page->items())->map(fn ($i) => $this->row($i)),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ];
    }

    public function show(MaintenanceInvoice $invoice)
    {
        $invoice->load(['customer:id,name,phone', 'jobCard.parts.part', 'payments.receiver:id,name']);
        $locale = app()->getLocale();

        return $this->row($invoice) + [
            'parts_total' => (string) $invoice->parts_total,
            'labor_total' => (string) $invoice->labor_total,
            'lines' => $invoice->jobCard?->parts->map(fn ($l) => [
                'name' => $l->part?->getTranslation('name', $locale), 'sku' => $l->part?->sku,
                'quantity' => $l->quantity, 'unit_price' => (string) $l->unit_price,
            ]),
            'payments' => $invoice->payments->map(fn ($p) => [
                'amount' => (string) $p->amount, 'method' => $p->method, 'reference' => $p->reference,
                'received_by' => $p->receiver?->name, 'received_at' => $p->received_at->toAtomString(), 'note' => $p->note,
            ]),
        ];
    }

    /** POST /admin/invoices/{invoice}/payments  money taken at the counter */
    public function recordPayment(Request $request, MaintenanceInvoice $invoice)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'lte:' . max(0, (float) $invoice->balance())],
            'method' => ['required', 'in:cash,bank_transfer,mobile_money,card_terminal'],
            'reference' => ['nullable', 'string', 'max:100'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $invoice->recordPayment(number_format((float) $data['amount'], 2, '.', ''), $data['method'], $data['reference'] ?? null, $request->user()->id, $data['note'] ?? null);

        return $this->show($invoice->fresh());
    }

    /** POST /admin/invoices/{invoice}/void: only before any money was received. */
    public function void(MaintenanceInvoice $invoice)
    {
        if (bccomp((string) $invoice->paid_amount, '0', 2) !== 0) {
            throw new CheckoutException('An invoice with payments cannot be voided.', 'invoice_has_payments');
        }
        $invoice->update(['status' => 'void']);

        return $this->row($invoice);
    }

    private function row(MaintenanceInvoice $i): array
    {
        return [
            'id' => $i->id,
            'number' => $i->number,
            'job_card' => $i->jobCard?->number,
            'customer' => $i->customer?->only(['id', 'name', 'phone']),
            'status' => $i->status,
            'is_overdue' => in_array($i->status, ['unpaid', 'partially_paid'], true) && $i->due_at?->isPast(),
            'currency' => $i->currency,
            'total' => (string) $i->total,
            'paid_amount' => (string) $i->paid_amount,
            'balance' => $i->balance(),
            'issued_at' => $i->issued_at?->toAtomString(),
            'due_at' => $i->due_at?->toAtomString(),
        ];
    }
}
