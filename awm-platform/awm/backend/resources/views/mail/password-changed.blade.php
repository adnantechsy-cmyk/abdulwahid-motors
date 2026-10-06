@if ($locale === 'en')
Hello {{ $user->name }},

The password of your Abdul Wahid Motors account was just changed, and every device was signed out.

If this was you, no action is needed. If it was not, reset your password again right away and contact us.
@else
مرحباً {{ $user->name }}،

تم للتو تغيير كلمة مرور حسابك في عبد الواحد موتورز، وتم تسجيل الخروج من كل الأجهزة.

إن كنت أنت من فعل ذلك فلا حاجة لأي إجراء. وإن لم تكن أنت، فأعد تعيين كلمة المرور فوراً وتواصل معنا.
@endif
