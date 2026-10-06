@if ($locale === 'en')
Hello {{ $user->name }},

We received a request to reset the password of your Abdul Wahid Motors account{{ $staff ? ' (staff account)' : '' }}.

Open this link to choose a new password. It can be used once and expires soon:
{!! $url !!}

If you did not ask for this, ignore this email: your password stays as it is.
@else
مرحباً {{ $user->name }}،

وصلنا طلب لإعادة تعيين كلمة المرور لحسابك في عبد الواحد موتورز{{ $staff ? ' (حساب موظف)' : '' }}.

افتح الرابط التالي لاختيار كلمة مرور جديدة. يُستخدم مرة واحدة وتنتهي صلاحيته قريباً:
{!! $url !!}

إن لم تطلب ذلك فتجاهل هذه الرسالة، وستبقى كلمة مرورك كما هي.
@endif
