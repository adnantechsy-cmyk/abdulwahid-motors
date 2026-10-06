'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Link } from '@/i18n/navigation';
import type { AdminBatteryReport } from '@/types/admin';
import { useAdminRun } from './useAdminRun';

const area = 'w-full border border-awm-line bg-white p-3 text-sm leading-6 focus-visible:outline-3 focus-visible:outline-awm-red';
const num = { type: 'number', inputMode: 'decimal', step: 'any', dir: 'ltr' } as const;

/** One battery health reading for one customer car. The certificate number and verification code are made by Laravel. */
export function BatteryForm({ vehicleId, defaultMileage }: { vehicleId: number; defaultMileage: number | null }) {
  const t = useTranslations('admin.battery.form');
  const ta = useTranslations('admin');
  const locale = useLocale();
  const { run, pending, error } = useAdminRun();
  const id = useId();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ soh: '', soc: '', pack: '', cmin: '', cmax: '', tmin: '', tmax: '', iso: '', cycles: '', mileage: defaultMileage ? String(defaultMileage) : '', date: today, result: '', fAr: '', fEn: '', rAr: '', rEn: '' });
  const [issued, setIssued] = useState<AdminBatteryReport | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f, v: string) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };
  const n = (v: string) => (v.trim() === '' ? null : Number(v));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problems: Record<string, string> = {};
    const soh = n(f.soh);
    if (soh === null || Number.isNaN(soh) || soh < 0 || soh > 100) problems.soh = t('errors.soh');
    const cmin = n(f.cmin), cmax = n(f.cmax), tmin = n(f.tmin), tmax = n(f.tmax);
    if (cmin !== null && cmax !== null && cmax < cmin) problems.cmax = t('errors.range');
    if (tmin !== null && tmax !== null && tmax < tmin) problems.tmax = t('errors.range');
    setErrors(problems);
    if (Object.keys(problems).length) return;

    const body = {
      state_of_health_pct: soh,
      state_of_charge_pct: n(f.soc),
      pack_voltage_v: n(f.pack),
      cell_voltage_min_v: cmin,
      cell_voltage_max_v: cmax,
      cell_temp_min_c: tmin,
      cell_temp_max_c: tmax,
      insulation_resistance_mohm: n(f.iso),
      charge_cycles: n(f.cycles),
      mileage_km: n(f.mileage),
      inspected_at: f.date || null,
      ...(f.result ? { result: f.result } : {}),
      findings: { ar: f.fAr.trim() || null, en: f.fEn.trim() || null },
      recommendations: { ar: f.rAr.trim() || null, en: f.rEn.trim() || null },
    };
    const r = await run<AdminBatteryReport>('POST', `customer-vehicles/${vehicleId}/battery-inspections`, body);
    if (r.ok) setIssued(r.data);
  }

  if (issued) {
    return (
      <div role="status" className="flex flex-col gap-4 border border-awm-line border-s-4 border-s-awm-red bg-white p-6">
        <h2 className="text-xl font-extrabold">{t('issuedTitle')}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="font-bold">{t('number')}</dt><dd className="font-mono font-bold" dir="ltr">{issued.certificate_number}</dd>
          <dt className="font-bold">{t('code')}</dt><dd className="font-mono" dir="ltr">{issued.verification_code}</dd>
          <dt className="font-bold">{t('result')}</dt><dd>{issued.result.label}</dd>
          <dt className="font-bold">{t('validUntil')}</dt><dd>{issued.valid_until ?? '—'}</dd>
        </dl>
        <div className="flex flex-wrap gap-3">
          <Link href={`/certificates/${issued.verification_code}`} className={buttonClasses('primary', 'md')}>{t('viewCertificate')}</Link>
          <Link href="/admin/battery" className={buttonClasses('outline', 'md')}>{t('backToList')}</Link>
        </div>
        <p className="text-xs text-awm-muted">{t('issuedHint')}</p>
      </div>
    );
  }

  const field = (k: keyof typeof f, label: string, extra: Record<string, unknown> = {}) => (
    <TextField label={label} value={f[k]} onChange={(e) => set(k, e.target.value)} error={errors[k]} {...num} {...extra} />
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8" lang={locale}>
      <fieldset disabled={pending} className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-3">
        <legend className="mb-3 text-sm font-extrabold">{t('health')}</legend>
        {field('soh', t('soh'), { min: 0, max: 100, required: true, hint: t('sohHint') })}
        {field('soc', t('soc'), { min: 0, max: 100, tag: ta('optional') })}
        {field('cycles', t('cycles'), { step: 1, min: 0, tag: ta('optional') })}
      </fieldset>

      <fieldset disabled={pending} className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-3">
        <legend className="mb-3 text-sm font-extrabold">{t('readings')}</legend>
        {field('pack', t('pack'), { min: 0, tag: ta('optional') })}
        {field('cmin', t('cellMin'), { min: 0, max: 5, tag: ta('optional') })}
        {field('cmax', t('cellMax'), { min: 0, max: 5, tag: ta('optional') })}
        {field('tmin', t('tempMin'), { min: -40, max: 100, tag: ta('optional') })}
        {field('tmax', t('tempMax'), { min: -40, max: 100, tag: ta('optional') })}
        {field('iso', t('insulation'), { min: 0, tag: ta('optional') })}
      </fieldset>

      <fieldset disabled={pending} className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-3">
        <legend className="mb-3 text-sm font-extrabold">{t('visit')}</legend>
        {field('mileage', t('mileage'), { step: 1, min: 0, tag: ta('optional') })}
        <TextField label={t('date')} type="date" value={f.date} max={today} onChange={(e) => set('date', e.target.value)} dir="ltr" />
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-res`} className="text-sm font-bold">{t('resultLabel')}</label>
          <select id={`${id}-res`} value={f.result} onChange={(e) => set('result', e.target.value)} className="h-12 w-full border border-awm-line bg-white px-3" aria-describedby={`${id}-res-hint`}>
            <option value="">{t('resultAuto')}</option>
            {(['pass', 'attention', 'fail'] as const).map((r) => <option key={r} value={r}>{t(`results.${r}`)}</option>)}
          </select>
          <p id={`${id}-res-hint`} className="text-xs text-awm-muted">{t('resultHint')}</p>
        </div>
      </fieldset>

      <fieldset disabled={pending} className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
        <legend className="mb-3 text-sm font-extrabold">{t('notes')}</legend>
        {([['fAr', 'findingsAr', 'ar'], ['fEn', 'findingsEn', 'en'], ['rAr', 'recommendationsAr', 'ar'], ['rEn', 'recommendationsEn', 'en']] as const).map(([k, label, lang]) => (
          <div key={k} className="flex flex-col gap-2">
            <label htmlFor={`${id}-${k}`} className="text-sm font-bold">{t(label)}</label>
            <textarea id={`${id}-${k}`} value={f[k]} onChange={(e) => set(k, e.target.value)} rows={3} maxLength={2000} lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={area} />
          </div>
        ))}
        <p className="text-xs text-awm-muted md:col-span-2">{t('notesHint')}</p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClasses('primary', 'md')}>{pending ? ta('working') : t('issue')}</button>
        {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
      </div>
    </form>
  );
}