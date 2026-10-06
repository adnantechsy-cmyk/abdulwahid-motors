'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Field, Input } from '@/components/ui/primitives';

/** Interim login (no Figma frame received for this screen yet). */
export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('login');
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Locale': locale },
      body: JSON.stringify({ login: f.get('login'), password: f.get('password') }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.errors?.login?.[0] ?? data.message ?? t('error'));
      setBusy(false);
      return;
    }
    // Only same-site paths are followed after login.
    const safeNext = next && next.startsWith(`/${locale}/`) && !next.startsWith('//') ? next : null;
    window.location.href = safeNext ?? (data.user?.roles?.length ? `/${locale}/admin` : `/${locale}/account`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label={t('login')} hint={t('loginHint')}><Input name="login" required autoComplete="username" dir="ltr" /></Field>
      <Field label={t('password')}><Input name="password" type="password" required autoComplete="current-password" dir="ltr" /></Field>
      {error && <p role="alert" className="border-s-4 border-awm-red bg-awm-red/5 p-3 text-sm">{error}</p>}
      <Button type="submit" size="lg" disabled={busy}>{busy ? t('working') : t('submit')}</Button>
    </form>
  );
}
