New message from the website contact form

Topic:   {{ $contact->topic }}
Name:    {{ $contact->name }}
Phone:   {{ $contact->phone ?: '-' }}
Email:   {{ $contact->email ?: '-' }}
Language: {{ $contact->locale }}
Sent:    {{ $contact->created_at->format('Y-m-d H:i') }}

{{ $contact->message }}
