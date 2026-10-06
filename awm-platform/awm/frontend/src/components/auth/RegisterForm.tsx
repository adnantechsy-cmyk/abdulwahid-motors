'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PasswordField, TextField } from '@/components/ui/Field';
import { buttonClasses } from '@/components/ui/Button';
import { postAuth, type SubmitResult } from '@/lib/auth-client';
import { safeNextPath } from '@/lib/auth';
import { FormAlert } from './FormAlert';

export function RegisterForm({ next }: { next?: string }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Extract<SubmitResult, { ok: false }> | null>(null);
  const [mismatch, setMismatch] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password'));
    const confirmation = String(form.get('password_confirmation'));

    // Cheap client check; Laravel still validates everything.
    if (password !== confirmation) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    setPending(true);
    setFailure(null);

    const result = await postAuth(
      'register',
      {
        name: String(form.get('name')).trim(),
        phone: String(form.get('phone')).trim(),
        email: String(form.get('email')).trim(),
        password,
        password_confirmation: confirmation,
      },
      locale,
    );
    if (result.ok) {
      window.location.assign(safeNextPath(next, locale));
      return;
    }
    setFailure(result);
    setPending(false);
  }

  const errors = failure?.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormAlert result={failure} messages={{ throttled: t('errors.tooMany'), unavailable: t('errors.unavailable'), unknown: t('errors.generic') }} />

      <TextField name="name" label={t('register.name')} placeholder={t('register.namePlaceholder')} error={errors.name} autoComplete="name" required />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          name="phone"
          type="tel"
          label={t('register.phone')}
          hint={t('register.phoneHint')}
          placeholder="09XXXXXXXX"
          error={errors.phone}
          autoComplete="tel"
          inputMode="tel"
          dir="ltr"
          className="text-start"
          required
        />
        <TextField
          name="email"
          type="email"
          label={t('register.email')}
          tag={t('register.optional')}
          placeholder="name@example.com"
          error={errors.email}
          autoComplete="email"
          dir="ltr"
          className="text-start"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <PasswordField
          name="password"
          label={t('register.password')}
          hint={t('register.passwordHint')}
          showLabel={t('showPassword')}
          hideLabel={t('hidePassword')}
          error={errors.password}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <PasswordField
          name="password_confirmation"
          label={t('register.confirm')}
          showLabel={t('showPassword')}
          hideLabel={t('hidePassword')}
          error={mismatch ? t('errors.mismatch') : undefined}
          autoComplete="new-password"
          required
        />
      </div>

      <button type="submit" disabled={pending} className={buttonClasses('primary', 'lg', 'w-full')}>
        {pending ? t('register.submitting') : t('register.submit')}
      </button>

      <p className="border-t border-awm-line pt-5 text-sm text-awm-muted">
        {t('register.haveAccount')}{' '}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="font-bold text-awm-red underline underline-offset-4">
          {t('register.login')}
        </Link>
      </p>
    </form>
  );
}
