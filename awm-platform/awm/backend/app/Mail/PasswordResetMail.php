<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** The "reset your password" email: one link to the website, in the customer's language. */
class PasswordResetMail extends Mailable
{
    public function __construct(public User $user, public string $url, public string $locale = 'ar', public bool $staff = false) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->locale === 'en'
            ? 'Reset your Abdul Wahid Motors password'
            : 'إعادة تعيين كلمة المرور - عبد الواحد موتورز');
    }

    public function content(): Content
    {
        return new Content(text: 'mail.password-reset');
    }
}
