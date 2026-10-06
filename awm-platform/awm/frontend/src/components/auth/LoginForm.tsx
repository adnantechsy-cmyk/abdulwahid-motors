'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PasswordField, TextField } from '@/components/ui/Field';
import { buttonClasses } from '@/components/ui/Button';
import { postAuth, type SubmitResult } from '@/lib/auth-client';
import { safeNextPath } from '@/lib/auth';
import { FormAlert } from './FormAlert';
import { GoogleButton } from './GoogleButton';

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Extract<SubmitResult, { ok: false }> | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setFailure(null);

    const result = await postAuth('login', { login: String(form.get('login')).trim(), password: form.get('password') }, locale);
    if (result.ok) {
      // Full navigation so every server component re-reads the new session cookie.
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

      <TextField
        name="login"
        label={t('login.loginLabel')}
        hint={t('login.loginHint')}
        error={errors.login}
        autoComplete="username"
        inputMode="email"
        dir="ltr"
        className="text-start"
        required
      />
      <PasswordField
        name="password"
        label={t('login.password')}
        showLabel={t('showPassword')}
        hideLabel={t('hidePassword')}
        error={errors.password}
        autoComplete="current-password"
        required
      />

      <p className="-mt-2 text-sm">
        <Link href="/forgot-password" className="font-bold text-awm-red underline underline-offset-4">{t('login.forgot')}</Link>
      </p>

      <button type="submit" disabled={pending} className={buttonClasses('primary', 'lg', 'w-full')}>
        {pending ? t('login.submitting') : t('login.submit')}
      </button>

      <GoogleButton next={next} />

      <p className="border-t border-awm-line pt-5 text-sm text-awm-muted">
        {t('login.noAccount')}{' '}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'} className="font-bold text-awm-red underline underline-offset-4">
          {t('login.createAccount')}
        </Link>
      </p>
    </form>
  );
}
