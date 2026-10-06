<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Checkout\CheckoutException;
use App\Services\Checkout\CheckoutService;
use App\Services\Payments\PaymentService;
use Illuminate\Http\Request;

/**
 * Staff view of every order and reservation request. The website only captures the order; the sales head
 * settles payment with the customer and records it here (see PaymentService::recordManual).
 */
class OrderAdminController extends Controller
{
    /** Which order statuses each list tab shows. */
    private const TABS = [
        'unpaid' => ['pending', 'awaiting_payment', 'failed'],
        'paid' => ['paid'],
        'processing' => ['processing'],
        'fulfilled' => ['fulfilled'],
        'closed' => ['cancelled', 'refunded', 'partially_refunded'],
    ];

    public function __construct(private PaymentService $payments, private CheckoutService $checkout) {}

    /** GET /admin/orders?tab=unpaid|paid|processing|fulfilled|closed&flow=&q=  (default tab: unpaid) */
    public function index(Request $request)
    {
        $data = $request->validate([
            'tab' => ['nullable', 'in:' . implode(',', array_keys(self::TABS))],
            'flow' => ['nullable', 'in:spare_part,vehicle_reservation,maintenance_invoice'],
            'q' => ['nullable', 'string', 'max:60'],
        ]);
        $q = $data['q'] ?? null;

        $page = Order::withCount('items')
            ->whereIn('status', self::TABS[$data['tab'] ?? 'unpaid'])
            ->when($data['flow'] ?? null, fn ($query, $flow) => $query->where('flow', $flow))
            ->when($q, fn ($query) => $query->where(fn ($w) => $w
                ->where('number', 'like', "%{$q}%")
                ->orWhere('customer->phone', 'like', "%{$q}%")
                ->orWhere('customer->name', 'like', "%{$q}%")))
            ->latest('id')
            ->paginate(20)
            ->through(fn (Order $o) => $this->summary($o));

        return $page;
    }

    /** GET /admin/orders/{number} */
    public function show(string $number)
    {
        $order = Order::with(['items', 'payments.gateway:id,code,name', 'pdi:id,order_id,status'])
            ->where('number', $number)->firstOrFail();
        $locale = app()->getLocale();

        return $this->summary($order) + [
            'items' => $order->items->map(fn ($i) => [
                'id' => $i->id,
                'name' => $i->name[$locale] ?? ($i->name['ar'] ?? ''),
                'sku' => $i->sku,
                'quantity' => $i->quantity,
                'unit_price' => (string) $i->unit_price,
                'line_total' => (string) $i->line_total,
            ])->values(),
            'payments' => $order->payments->map(fn ($p) => [
                'id' => $p->uuid,
                'status' => $p->status->value,
                'amount' => (string) $p->amount,
                'method' => $p->gateway?->getTranslation('name', $locale),
                'method_code' => $p->gateway?->code,
                'manual' => (bool) ($p->payload['manual'] ?? false),
                'note' => $p->payload['note'] ?? null,
                'has_proof' => filled($p->proof_path),
                'failure_message' => $p->failure_message,
                'created_at' => $p->created_at->toAtomString(),
                'confirmed_at' => $p->confirmed_at?->toAtomString(),
            ])->values(),
            'shipping_address' => $order->shipping_address,
            'pdi' => $order->pdi ? ['id' => $order->pdi->id, 'status' => $order->pdi->status->value] : null,
            'actions' => $this->actions($order),
        ];
    }

    /** POST /admin/orders/{number}/payment  {method?: in_person|bank_transfer|mobile_money, note?} */
    public function recordPayment(Request $request, string $number)
    {
        $data = $request->validate([
            'method' => ['nullable', 'in:in_person,bank_transfer,mobile_money'],
            'note' => ['nullable', 'string', 'max:300'],
        ]);

        try {
            $this->payments->recordManual(
                Order::where('number', $number)->firstOrFail(),
                $request->user(),
                $data['method'] ?? 'in_person',
                $data['note'] ?? null,
            );
        } catch (CheckoutException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => $e->errorCode], 422);
        }

        return $this->show($number);
    }

    /** PUT /admin/orders/{number}/status  {status: processing|fulfilled}. Paid -> processing -> fulfilled. */
    public function status(Request $request, string $number)
    {
        $data = $request->validate(['status' => ['required', 'in:processing,fulfilled']]);
        $order = Order::where('number', $number)->firstOrFail();

        if (! in_array($data['status'], $this->actions($order)['advance'], true)) {
            return response()->json(['message' => 'That change is not allowed for this order.', 'code' => 'bad_transition'], 422);
        }

        $order->update(['status' => $data['status']]);

        return $this->show($number);
    }

    /** POST /admin/orders/{number}/cancel: unpaid orders only; releases the held stock or reservation. */
    public function cancel(string $number)
    {
        try {
            $this->checkout->cancel(Order::where('number', $number)->firstOrFail());
        } catch (CheckoutException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => $e->errorCode], 422);
        }

        return $this->show($number);
    }

    /**
     * What staff can do next. Car reservations are moved forward by the PDI (inspection and delivery) flow,
     * which sets processing and fulfilled itself, so they only get the payment and cancel actions here.
     *
     * @return array{record_payment: bool, advance: list<string>, cancel: bool}
     */
    private function actions(Order $order): array
    {
        $unpaid = $order->status->isPayable();
        $advance = [];

        if ($order->flow->value !== 'vehicle_reservation') {
            $advance = match ($order->status) {
                OrderStatus::Paid => $order->flow->value === 'spare_part' ? ['processing', 'fulfilled'] : ['fulfilled'],
                OrderStatus::Processing => ['fulfilled'],
                default => [],
            };
        }

        return ['record_payment' => $unpaid, 'advance' => $advance, 'cancel' => $unpaid];
    }

    private function summary(Order $o): array
    {
        return [
            'number' => $o->number,
            'flow' => $o->flow->value,
            'status' => $o->status->value,
            'currency' => $o->currency,
            'grand_total' => (string) $o->grand_total,
            'items_count' => $o->items_count ?? $o->items()->count(),
            'branch_pickup' => $o->branch_pickup,
            'placed_at' => $o->placed_at?->toAtomString(),
            'paid_at' => $o->paid_at?->toAtomString(),
            'customer' => [
                'name' => $o->customer['name'] ?? null,
                'phone' => $o->customer['phone'] ?? null,
                'email' => $o->customer['email'] ?? null,
            ],
        ];
    }
}
