<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

/** The website contact form inbox. Every message is kept here even if the email could not be sent. */
class ContactMessageAdminController extends Controller
{
    /** GET /admin/contact-messages?status=open|handled|all&topic= */
    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', 'in:open,handled,all'],
            'topic' => ['nullable', 'in:info,sales,parts,management'],
        ]);
        $status = $data['status'] ?? 'open';

        return ContactMessage::query()
            ->when($status === 'open', fn ($q) => $q->whereNull('handled_at'))
            ->when($status === 'handled', fn ($q) => $q->whereNotNull('handled_at'))
            ->when($data['topic'] ?? null, fn ($q, $t) => $q->where('topic', $t))
            ->latest('id')
            ->paginate(20)
            ->through(fn (ContactMessage $m) => [
                'id' => $m->id,
                'name' => $m->name,
                'phone' => $m->phone,
                'email' => $m->email,
                'topic' => $m->topic,
                'message' => $m->message,
                'locale' => $m->locale,
                'mailed' => $m->mailed_at !== null,
                'handled' => $m->handled_at !== null,
                'handled_at' => $m->handled_at?->toAtomString(),
                'created_at' => $m->created_at->toAtomString(),
            ]);
    }

    /** PUT /admin/contact-messages/{message}  {handled: bool} */
    public function update(Request $request, ContactMessage $message)
    {
        $data = $request->validate(['handled' => ['required', 'boolean']]);

        $message->update([
            'handled_at' => $data['handled'] ? now() : null,
            'handled_by' => $data['handled'] ? $request->user()->id : null,
        ]);

        return ['id' => $message->id, 'handled' => $message->handled_at !== null];
    }
}