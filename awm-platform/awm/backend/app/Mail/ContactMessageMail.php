<?php

namespace App\Mail;

use App\Models\ContactMessage;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Internal notification: a visitor wrote to the team. Reply-To is the visitor, so "Reply" answers them. */
class ContactMessageMail extends Mailable
{
    public function __construct(public ContactMessage $contact) {}

    public function envelope(): Envelope
    {
        // Names come from a public form: strip line breaks so they can never inject mail headers.
        $name = trim(preg_replace('/[\r\n]+/', ' ', $this->contact->name));

        return new Envelope(
            replyTo: $this->contact->email ? [new Address($this->contact->email, $name)] : [],
            subject: "[Website] {$this->contact->topic}: {$name}",
        );
    }

    public function content(): Content
    {
        return new Content(text: 'mail.contact-message');
    }
}
