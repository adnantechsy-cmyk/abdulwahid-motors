'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Link } from '@/i18n/navigation';
import type { AdminCustomer } from '@/types/admin';
import { adminAction } from '@/lib/admin-client';

/**
 * Open an account for a customer who booked as a guest. The temporary password is shown ONCE, here, for staff
 * to pass on; it is not stored anywhere readable. We deliberately do not refresh the page after saving.
 */
export function CustomerForm({ defaults }: { defaults?: { name?: string; phone?: string } }) {
  const t = useTranslations('admin.customers.form');
  const ta = useTranslations('admin');
  const locale = useLocale();
  const id = useId();
  const [f, setF] = useState({ name: defaults?.name ?? '', phone: defaults?.phone ?? '', email: '', locale: locale === 'en' ? 'en' : 'ar' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<(AdminCustomer & { temporary_password: string }) | null>(null);
  const set = (k: keyof typeof f, v: string) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problems: Record<string, string> = {};
    if (f.name.trim().length < 2) problems.name = t('errors.name');
    if (!/^\+?[0-9 ]{7,20}$/.test(f.phone.trim())) problems.phone = t('errors.phone');
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) problems.email = t('errors.email');
    setErrors(problems);
    if (Object.keys(problems).length) return;

    setBusy(true); setError(null);
    const r = await adminAction<AdminCustomer & { temporary_password: string }>('POST', 'customers', locale, { name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || null, locale: f.locale });
    setBusy(false);
    if (r.ok) return setCreated(r.data);
    if (r.status === 422) return setError(r.message || t('errors.taken'));
    setError(r.status === 0 || r.status >= 500 ? ta('errors.unavailable') : r.status === 403 ? ta('errors.forbidden') : r.message || ta('errors.generic'));
  }

  if (created) {
    return (
      <div role="status" className="flex flex-col gap-4 border border-awm-line border-s-4 border-s-awm-red bg-white p-6">
        <h2 className="text-xl font-extrabold">{t('createdTitle', { name: created.name })}</h2>
        <p className="text-sm text-awm-muted">{t('createdText')}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="font-bold">{t('loginWith')}</dt><dd className="font-mono" dir="ltr">{created.phone}</dd>
          <dt className="font-bold">{t('tempPassword')}</dt><dd className="font-mono text-lg font-bold" dir="ltr">{created.temporary_password}</dd>
        </dl>
        <p className="border-s-4 border-awm-black bg-awm-panel p-3 text-xs text-awm-muted">{t('shownOnce')}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/admin/customers/${created.id}`} className={buttonClasses('primary', 'md')}>{t('openCustomer')}</Link>
          <button type="button" onClick={() => navigator.clipboard?.writeText(created.temporary_password).catch(() => undefined)} className={buttonClasses('outline', 'md')}>{t('copy')}</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <TextField label={t('name')} value={f.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required maxLength={120} autoComplete="off" />
      <TextField label={t('phone')} value={f.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} required maxLength={30} dir="ltr" inputMode="tel" autoComplete="off" hint={t('phoneHint')} />
      <TextField label={t('email')} type="email" value={f.email} onChange={(e) => set('email', e.target.value)} error={errors.email} maxLength={190} dir="ltr" autoComplete="off" tag={ta('optional')} hint={t('emailHint')} />
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-lang`} className="text-sm font-bold">{t('language')}</label>
        <select id={`${id}-lang`} value={f.locale} onChange={(e) => set('locale', e.target.value)} className="h-12 w-full border border-awm-line bg-white px-3">
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-4 md:col-span-2">
        <button type="submit" disabled={busy} className={buttonClasses('primary', 'md')}>{busy ? ta('working') : t('create')}</button>
        {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
      </div>
    </form>
  );
}