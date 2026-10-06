<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\ContactMessageMail;
use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ContactController extends Controller
{
    /** POST /contact. Stored first, then mailed to the department the visitor chose. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+()\\-\\s]{6,30}$/'],
            'email' => ['nullable', 'email:rfc', 'max:120'],
            'topic' => ['required', 'in:info,sales,parts,management'],
            'message' => ['required', 'string', 'min:10', 'max:3000'],
            'website' => ['nullable', 'string', 'max:200'],   // honeypot
        ]);

        if (blank($data['phone'] ?? null) && blank($data['email'] ?? null)) {
            return response()->json(['message' => 'Give a phone number or an email.', 'errors' => ['contact' => ['Give a phone number or an email.']]], 422);
        }

        // Bots fill the hidden field. Pretend it worked and drop the message.
        if (filled($data['website'] ?? null)) {
            return response()->json(['status' => 'received'], 202);
        }

        $contact = ContactMessage::create([
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'topic' => $data['topic'],
            'message' => $data['message'],
            'locale' => app()->getLocale() === 'en' ? 'en' : 'ar',
            'ip' => $request->ip(),
        ]);

        $to = config("awm.contact.recipients.{$data['topic']}") ?: config('awm.contact.recipients.info');

        try {
            Mail::to($to)->send(new ContactMessageMail($contact));
            $contact->update(['mailed_at' => now()]);
        } catch (Throwable $e) {
            // The message is safely stored; staff can still read it. Don't show the visitor a failure for our SMTP problem.
            Log::warning('Contact message mail failed', ['id' => $contact->id, 'error' => $e->getMessage()]);
        }

        return response()->json(['status' => 'received'], 202);
    }
}
