<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\CartFlow;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Checkout\CheckoutException;
use App\Services\Checkout\CheckoutService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrderAdminController extends Controller
{
    public function __construct(private CheckoutService $checkout) {}

    /** GET /admin/orders?flow=&status=&q= */
    public function index(Request $request)
    {
        return Order::query()
            ->when($request->query('flow'), fn ($q, $f) => $q->where('flow', $f))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('q'), function ($q, $term) {
                $like = '%' . addcslashes($term, '%_\\') . '%';
                $q->where(fn ($w) => $w->where('number', 'like', $like)
                    ->orWhere('customer->phone', 'like', $like)->orWhere('customer->name', 'like', $like));
            })
            ->latest('id')->paginate(30)
            ->through(fn (Order $o) => $this->row($o));
    }

    public function show(Order $order)
    {
        $order->load(['items', 'payments.gateway', 'pdi', 'user:id,name,phone']);
        $locale = app()->getLocale();

        return $this->row($order) + [
            'user' => $order->user?->only(['id', 'name', 'phone']),
            'shipping_address' => $order->shipping_address,
            'notes' => $order->notes,
            'items' => $order->items->map(fn ($i) => [
                'type' => $i->orderable_type, 'id' => $i->orderable_id,
                'name' => $i->name[$locale] ?? $i->name['en'] ?? '', 'sku' => $i->sku,
                'quantity' => $i->quantity, 'unit_price' => (string) $i->unit_price, 'line_total' => (string) $i->line_total,
            ]),
            'payments' => $order->payments->map(fn ($p) => $this->payment($p)),
            'pdi_id' => $order->pdi?->id,
        ];
    }

    /**
     * PUT /admin/orders/{order}/status {status: processing|fulfilled}
     * Spare-part orders only: car reservations move through PDI, invoices settle themselves.
     */
    public function updateStatus(Request $request, Order $order)
    {
        $to = OrderStatus::from($request->validate(['status' => ['required', 'in:processing,fulfilled']])['status']);

        if ($order->flow !== CartFlow::SparePart) {
            throw new CheckoutException('Only spare-part orders are moved by hand.', 'flow_not_manual');
        }
        if (! in_array($order->status, [OrderStatus::Paid, OrderStatus::Processing], true)) {
            throw new CheckoutException('The order must be paid first.', 'order_not_paid');
        }
        $order->update(['status' => $to]);

        return $this->row($order);
    }

    /** POST /admin/orders/{order}/cancel: unpaid orders only; releases stock / reservation. */
    public function cancel(Order $order)
    {
        $this->checkout->cancel($order);

        return $this->row($order->fresh());
    }

    /** GET /admin/payments?status=awaiting_confirmation (default): the confirmation queue. */
    public function payments(Request $request)
    {
        return Payment::with(['order:id,number,customer,flow', 'gateway'])
            ->where('status', $request->query('status', PaymentStatus::AwaitingConfirmation->value))
            ->oldest()->paginate(30)
            ->through(fn (Payment $p) => $this->payment($p) + [
                'order_number' => $p->order?->number,
                'customer' => $p->order?->customer,
            ]);
    }

    /** GET /admin/payments/{uuid}/proof: download the uploaded receipt (private disk). */
    public function proof(string $uuid)
    {
        $payment = Payment::where('uuid', $uuid)->firstOrFail();
        abort_unless($payment->proof_path && Storage::disk('private')->exists($payment->proof_path), 404);

        return Storage::disk('private')->download($payment->proof_path, "receipt-{$payment->order->number}." . pathinfo($payment->proof_path, PATHINFO_EXTENSION));
    }

    private function row(Order $o): array
    {
        return [
            'number' => $o->number,
            'id' => $o->id,
            'flow' => $o->flow->value,
            'status' => $o->status->value,
            'customer' => $o->customer,
            'currency' => $o->currency,
            'grand_total' => (string) $o->grand_total,
            'branch_pickup' => $o->branch_pickup,
            'placed_at' => $o->placed_at?->toAtomString(),
            'paid_at' => $o->paid_at?->toAtomString(),
        ];
    }

    private function payment(Payment $p): array
    {
        return [
            'id' => $p->uuid,
            'gateway' => $p->gateway?->code,
            'method' => $p->gateway?->getTranslation('name', app()->getLocale()),
            'status' => $p->status->value,
            'amount' => (string) $p->amount,
            'currency' => $p->currency,
            'reference' => $p->gateway_reference,
            'has_proof' => (bool) $p->proof_path,
            'failure_message' => $p->failure_message,
            'created_at' => $p->created_at->toAtomString(),
            'confirmed_at' => $p->confirmed_at?->toAtomString(),
        ];
    }
}
