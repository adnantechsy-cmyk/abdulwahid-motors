'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { TextField } from '@/components/ui/Field';
import { buttonClasses } from '@/components/ui/Button';
import { postAuth, type SubmitResult } from '@/lib/auth-client';
import { safeNextPath } from '@/lib/auth';
import { FormAlert } from './FormAlert';

type Props = { challenge: string; next?: string; onBack: () => void };

/** Step two of a staff login: the 6-digit code from the authenticator app, or one of the saved recovery codes. */
export function TwoFactorStep({ challenge, next, onBack }: Props) {
  const t = useTranslations('auth.twoFactor');
  const ta = useTranslations('auth');
  const locale = useLocale();
  const [recovery, setRecovery] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Extract<SubmitResult, { ok: false }> | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  // Move focus to the new step so screen-reader and keyboard users know the form changed.
  useEffect(() => heading.current?.focus(), []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get('code') ?? '').trim();
    if (!value) return setFailure({ ok: false, fieldErrors: { code: t('required') }, kind: 'validation' });

    setPending(true);
    setFailure(null);
    const result = await postAuth('two-factor', { challenge, ...(recovery ? { recovery_code: value } : { code: value.replace(/\s+/g, '') }) }, locale);
    if (result.ok) {
      window.location.assign(safeNextPath(next, locale));
      return;
    }
    setFailure(result);
    setPending(false);
  }

  const raw = failure?.fieldErrors.code;
  const error = raw ? (raw === t('required') ? raw : raw.toLowerCase().includes('expired') ? t('expired') : t(recovery ? 'wrongRecovery' : 'wrong')) : undefined;
  const locked = failure?.kind === 'throttled';

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h2 ref={heading} tabIndex={-1} className="text-xl font-extrabold outline-none">{t('title')}</h2>
        <p className="mt-2 text-sm leading-6 text-awm-muted">{recovery ? t('recoveryText') : t('text')}</p>
      </div>

      {locked ? <p role="alert" className="border-s-4 border-awm-red bg-awm-panel p-4 text-sm font-medium">{t('locked')}</p> : <FormAlert result={failure} messages={{ throttled: ta('errors.tooMany'), unavailable: ta('errors.unavailable'), unknown: ta('errors.generic') }} />}

      <TextField
        key={recovery ? 'recovery' : 'code'}
        name="code"
        label={recovery ? t('recoveryLabel') : t('codeLabel')}
        hint={recovery ? t('recoveryHint') : t('codeHint')}
        error={error}
        autoComplete="one-time-code"
        inputMode={recovery ? 'text' : 'numeric'}
        maxLength={recovery ? 30 : 12}
        dir="ltr"
        className="text-start tracking-widest"
        autoFocus
        required
      />

      <button type="submit" disabled={pending} className={buttonClasses('primary', 'lg', 'w-full')}>{pending ? t('verifying') : t('verify')}</button>

      <div className="flex flex-wrap justify-between gap-3 border-t border-awm-line pt-5 text-sm">
        <button type="button" onClick={() => { setRecovery((r) => !r); setFailure(null); }} className="font-bold text-awm-red underline underline-offset-4">{recovery ? t('useApp') : t('useRecovery')}</button>
        <button type="button" onClick={onBack} className="font-bold text-awm-muted underline underline-offset-4 hover:text-awm-black">{t('back')}</button>
      </div>
    </form>
  );
}
