<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Sent after a successful reset, so an unexpected change is noticed. */
class PasswordChangedMail extends Mailable
{
    public function __construct(public User $user, public string $locale = 'ar') {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->locale === 'en'
            ? 'Your Abdul Wahid Motors password was changed'
            : 'تم تغيير كلمة المرور - عبد الواحد موتورز');
    }

    public function content(): Content
    {
        return new Content(text: 'mail.password-changed');
    }
}
