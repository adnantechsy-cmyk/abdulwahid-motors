'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PasswordField } from '@/components/ui/Field';
import { buttonClasses } from '@/components/ui/Button';
import { postAuth, type SubmitResult } from '@/lib/auth-client';
import { FormAlert } from './FormAlert';

/** Sets the new password. `token` and `email` come from the link in the email. */
export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Extract<SubmitResult, { ok: false }> | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmation = String(form.get('password_confirmation') ?? '');
    if (password.length < 8) return setFailure({ ok: false, fieldErrors: { password: t('reset.tooShort') }, kind: 'validation' });
    if (password !== confirmation) return setFailure({ ok: false, fieldErrors: { password_confirmation: t('reset.mismatch') }, kind: 'validation' });

    setPending(true);
    setFailure(null);
    const result = await postAuth('reset-password', { email, token, password, password_confirmation: confirmation }, locale);
    setPending(false);
    if (result.ok) return setDone(true);
    setFailure(result);
  }

  if (done) {
    return (
      <div role="status" className="flex flex-col gap-4 border-s-4 border-awm-red bg-awm-panel p-6">
        <h2 className="text-lg font-extrabold">{t('reset.doneTitle')}</h2>
        <p className="leading-7 text-awm-muted">{t('reset.doneText')}</p>
        <Link href="/login" className={buttonClasses('primary', 'lg', 'self-start')}>{t('reset.toLogin')}</Link>
      </div>
    );
  }

  const errors = failure?.fieldErrors ?? {};
  const linkProblem = Boolean(errors.token) || failure?.code === 'invalid_token';

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {linkProblem ? (
        <p role="alert" className="border-s-4 border-awm-red bg-awm-panel p-4 text-sm font-medium">
          {t('reset.invalidLink')}{' '}
          <Link href="/forgot-password" className="font-bold text-awm-red underline underline-offset-4">{t('reset.requestNew')}</Link>
        </p>
      ) : (
        <FormAlert result={failure} messages={{ throttled: t('errors.tooMany'), unavailable: t('errors.unavailable'), unknown: t('errors.generic') }} />
      )}
      <p className="text-sm text-awm-muted">{t('reset.forAccount')} <span dir="ltr" className="font-bold text-awm-black">{email}</span></p>
      <PasswordField name="password" label={t('reset.password')} hint={t('reset.passwordHint')} showLabel={t('showPassword')} hideLabel={t('hidePassword')} error={errors.password} autoComplete="new-password" required />
      <PasswordField name="password_confirmation" label={t('reset.confirm')} showLabel={t('showPassword')} hideLabel={t('hidePassword')} error={errors.password_confirmation} autoComplete="new-password" required />
      <button type="submit" disabled={pending} className={buttonClasses('primary', 'lg', 'w-full')}>{pending ? t('reset.submitting') : t('reset.submit')}</button>
    </form>
  );
}
