'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { TextField } from '@/components/ui/Field';
import { buttonClasses } from '@/components/ui/Button';
import { postAuth, type SubmitResult } from '@/lib/auth-client';
import { FormAlert } from './FormAlert';

/** Asks for the email or phone used to sign up. The answer is always the same, so it never says whether the account exists. */
export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Extract<SubmitResult, { ok: false }> | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const login = String(new FormData(event.currentTarget).get('login') ?? '').trim();
    if (!login) return setFailure({ ok: false, fieldErrors: { login: t('forgot.required') }, kind: 'validation' });

    setPending(true);
    setFailure(null);
    const result = await postAuth('forgot-password', { login }, locale);
    setPending(false);
    if (result.ok) return setSent(true);
    setFailure(result);
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col gap-4 border-s-4 border-awm-red bg-awm-panel p-6">
        <h2 className="text-lg font-extrabold">{t('forgot.sentTitle')}</h2>
        <p className="leading-7 text-awm-muted">{t('forgot.sentText')}</p>
        <Link href="/login" className="font-bold text-awm-red underline underline-offset-4">{t('forgot.backToLogin')}</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormAlert result={failure} messages={{ throttled: t('errors.tooMany'), unavailable: t('errors.unavailable'), unknown: t('errors.generic') }} />
      <TextField name="login" label={t('forgot.loginLabel')} hint={t('forgot.loginHint')} error={failure?.fieldErrors.login} autoComplete="username" inputMode="email" dir="ltr" className="text-start" required />
      <button type="submit" disabled={pending} className={buttonClasses('primary', 'lg', 'w-full')}>{pending ? t('forgot.submitting') : t('forgot.submit')}</button>
      <p className="border-t border-awm-line pt-5 text-sm">
        <Link href="/login" className="font-bold text-awm-red underline underline-offset-4">{t('forgot.backToLogin')}</Link>
      </p>
    </form>
  );
}
