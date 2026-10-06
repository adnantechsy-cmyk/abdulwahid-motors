'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useAdminRun } from './useAdminRun';

/** Register a car for a customer (bought here or elsewhere): needed to open job cards and issue battery certificates. */
export function CarForm({ customerId }: { customerId: number }) {
  const t = useTranslations('admin.customers.car');
  const ta = useTranslations('admin');
  const { run, pending, error } = useAdminRun();
  const id = useId();
  const [f, setF] = useState({ model: '', model_year: '', vin: '', plate: '', color: '', mileage: '', purchased: '', warranty: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); setDone(false); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problems: Record<string, string> = {};
    if (!f.model.trim()) problems.model = t('errors.model');
    if (f.vin.trim() && !/^[A-Za-z0-9]{17}$/.test(f.vin.trim())) problems.vin = t('errors.vin');
    setErrors(problems);
    if (Object.keys(problems).length) return;

    const r = await run('POST', `customers/${customerId}/vehicles`, {
      model: f.model.trim(),
      model_year: f.model_year ? Number(f.model_year) : null,
      vin: f.vin.trim().toUpperCase() || null,
      plate_number: f.plate.trim() || null,
      color: f.color.trim() || null,
      last_mileage_km: f.mileage ? Number(f.mileage) : null,
      purchased_at: f.purchased || null,
      warranty_until: f.warranty || null,
    });
    if (r.ok) { setF({ model: '', model_year: '', vin: '', plate: '', color: '', mileage: '', purchased: '', warranty: '' }); setDone(true); }
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-5 md:grid-cols-3" aria-labelledby={`${id}-t`}>
      <p id={`${id}-t`} className="text-sm text-awm-muted md:col-span-3">{t('intro')}</p>
      <TextField label={t('model')} value={f.model} onChange={(e) => set('model', e.target.value)} error={errors.model} required maxLength={60} hint={t('modelHint')} />
      <TextField label={t('year')} type="number" inputMode="numeric" min="1990" max="2100" value={f.model_year} onChange={(e) => set('model_year', e.target.value)} dir="ltr" tag={ta('optional')} />
      <TextField label={t('color')} value={f.color} onChange={(e) => set('color', e.target.value)} maxLength={40} tag={ta('optional')} />
      <TextField label={t('vin')} value={f.vin} onChange={(e) => set('vin', e.target.value)} error={errors.vin} maxLength={17} dir="ltr" tag={ta('optional')} hint={t('vinHint')} />
      <TextField label={t('plate')} value={f.plate} onChange={(e) => set('plate', e.target.value)} maxLength={30} tag={ta('optional')} />
      <TextField label={t('mileage')} type="number" inputMode="numeric" min="0" value={f.mileage} onChange={(e) => set('mileage', e.target.value)} dir="ltr" tag={ta('optional')} />
      <TextField label={t('purchased')} type="date" value={f.purchased} onChange={(e) => set('purchased', e.target.value)} dir="ltr" tag={ta('optional')} />
      <TextField label={t('warranty')} type="date" value={f.warranty} onChange={(e) => set('warranty', e.target.value)} dir="ltr" tag={ta('optional')} />
      <div className="flex flex-wrap items-center gap-4 md:col-span-3">
        <button type="submit" disabled={pending} className={buttonClasses('primary', 'md')}>{pending ? ta('working') : t('add')}</button>
        {done && <p role="status" className="text-sm font-bold">{t('added')}</p>}
        {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
      </div>
    </form>
  );
}