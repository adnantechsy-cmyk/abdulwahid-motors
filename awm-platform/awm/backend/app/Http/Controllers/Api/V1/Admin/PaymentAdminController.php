<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Staff view of payments, for the confirmation queue (bank transfers and mobile money are confirmed by hand).
 * Confirming or rejecting is done by PaymentController::confirm / reject (same permission).
 */
class PaymentAdminController extends Controller
{
    /** GET /admin/payments?status=awaiting_confirmation|captured|failed|pending|cancelled  (default: awaiting_confirmation) */
    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', 'in:awaiting_confirmation,captured,failed,pending,cancelled'],
        ]);
        $locale = app()->getLocale();

        return Payment::with(['order:id,number,flow,status,customer,grand_total,currency,branch_pickup', 'gateway:id,code,name'])
            ->where('status', $data['status'] ?? 'awaiting_confirmation')
            ->latest('id')
            ->paginate(20)
            ->through(fn (Payment $p) => [
                'id' => $p->uuid,
                'status' => $p->status->value,
                'amount' => (string) $p->amount,
                'currency' => $p->currency,
                'reference' => $p->gateway_reference,
                'method' => $p->gateway?->getTranslation('name', $locale),
                'method_code' => $p->gateway?->code,
                'has_proof' => filled($p->proof_path),
                'failure_message' => $p->failure_message,
                'created_at' => $p->created_at->toAtomString(),
                'confirmed_at' => $p->confirmed_at?->toAtomString(),
                'order' => $p->order ? [
                    'number' => $p->order->number,
                    'flow' => $p->order->flow->value,
                    'status' => $p->order->status->value,
                    'grand_total' => (string) $p->order->grand_total,
                    'branch_pickup' => $p->order->branch_pickup,
                    'customer' => [
                        'name' => $p->order->customer['name'] ?? null,
                        'phone' => $p->order->customer['phone'] ?? null,
                        'email' => $p->order->customer['email'] ?? null,
                    ],
                ] : null,
            ]);
    }

    /** GET /admin/payments/{uuid}/proof: the uploaded receipt (private disk, never publicly reachable). */
    public function proof(string $uuid)
    {
        $payment = Payment::where('uuid', $uuid)->firstOrFail();
        $disk = Storage::disk('private');
        abort_unless($payment->proof_path && $disk->exists($payment->proof_path), 404);

        // Uploaded by a customer: never let the browser sniff it into something executable.
        return $disk->response($payment->proof_path, null, [
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
