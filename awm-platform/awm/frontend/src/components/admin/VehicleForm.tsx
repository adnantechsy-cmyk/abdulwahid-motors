'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useRouter } from '@/i18n/navigation';
import type { AdminVehicleDetail, PartCategory } from '@/types/admin';
import { SpecsEditor, specsFromRows, type SpecRow } from './SpecsEditor';
import { useAdminRun } from './useAdminRun';

type Props = { vehicle?: AdminVehicleDetail; categories: PartCategory[] };

const area = 'w-full border border-awm-line bg-white p-3 text-base focus-visible:outline-3 focus-visible:outline-awm-red';
const select = 'h-12 w-full border border-awm-line bg-white px-3 text-base';
const POWERTRAINS = ['bev', 'phev', 'hev', 'ice'] as const;
const BODIES = ['sedan', 'suv', 'hatchback', 'pickup'] as const;

/** Create or edit a showroom car in Arabic and English. The price can be hidden ("Contact us for price"). */
export function VehicleForm({ vehicle, categories }: Props) {
  const t = useTranslations('admin.vehicles.form');
  const ta = useTranslations('admin');
  const router = useRouter();
  const { run, pending, error } = useAdminRun();
  const id = useId();
  const [saved, setSaved] = useState(false);
  const [specRows, setSpecRows] = useState<SpecRow[]>(() => Object.entries(vehicle?.specs ?? {}).map(([key, value]) => ({ key, value: String(value) })));
  const [specError, setSpecError] = useState<string | null>(null);
  const reserved = vehicle?.status === 'reserved';

  const [f, setF] = useState({
    sku: vehicle?.sku ?? '',
    vin: vehicle?.vin ?? '',
    name_ar: vehicle?.name.ar ?? '',
    name_en: vehicle?.name.en ?? '',
    tagline_ar: vehicle?.tagline.ar ?? '',
    tagline_en: vehicle?.tagline.en ?? '',
    desc_ar: vehicle?.description.ar ?? '',
    desc_en: vehicle?.description.en ?? '',
    model_year: String(vehicle?.model_year ?? new Date().getFullYear()),
    body_type: vehicle?.body_type ?? '',
    powertrain: vehicle?.powertrain ?? 'bev',
    exterior_color: vehicle?.exterior_color ?? '',
    category_id: vehicle?.category_id ? String(vehicle.category_id) : '',
    price: vehicle?.price ?? '',
    show_price: vehicle?.show_price ?? true,
    deposit_amount: vehicle?.deposit_amount ?? '0',
    currency: vehicle?.currency ?? 'USD',
    status: vehicle?.status ?? 'available',
    branch: vehicle?.branch ?? '',
    is_published: vehicle?.is_published ?? false,
    is_featured: vehicle?.is_featured ?? false,
    sort_order: String(vehicle?.sort_order ?? 0),
  });
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => { setF((p) => ({ ...p, [key]: value })); setSaved(false); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = specsFromRows(specRows);
    if (!parsed.ok) return setSpecError(t(`specs.errors.${parsed.error}`, { name: parsed.key }));
    setSpecError(null);

    const body = {
      specs: parsed.specs,
      sku: f.sku.trim() || null,
      vin: f.vin.trim() || null,
      name: { ar: f.name_ar.trim(), en: f.name_en.trim() },
      tagline: { ar: f.tagline_ar.trim() || null, en: f.tagline_en.trim() || null },
      description: { ar: f.desc_ar.trim() || null, en: f.desc_en.trim() || null },
      model_year: Number(f.model_year),
      body_type: f.body_type.trim() || null,
      powertrain: f.powertrain,
      exterior_color: f.exterior_color.trim() || null,
      category_id: f.category_id ? Number(f.category_id) : null,
      price: f.price,
      show_price: f.show_price,
      deposit_amount: f.deposit_amount === '' ? 0 : f.deposit_amount,
      currency: f.currency,
      ...(reserved ? {} : { status: f.status }),
      branch: f.branch || null,
      is_published: f.is_published,
      is_featured: f.is_featured,
      sort_order: Number(f.sort_order) || 0,
    };

    if (vehicle) {
      const r = await run('PUT', `vehicles/${vehicle.id}`, body);
      if (r.ok) setSaved(true);
    } else {
      const r = await run<{ id: number }>('POST', 'vehicles', body);
      if (r.ok) router.push(`/admin/vehicles/${r.data.id}`);
    }
  }

  const check = (key: 'show_price' | 'is_published' | 'is_featured', label: string, hint: string) => (
    <div className="flex items-start gap-3">
      <input id={`${id}-${key}`} type="checkbox" checked={f[key]} onChange={(e) => set(key, e.target.checked)} className="mt-1 size-5 accent-awm-red" aria-describedby={`${id}-${key}-hint`} />
      <div>
        <label htmlFor={`${id}-${key}`} className="text-sm font-bold">{label}</label>
        <p id={`${id}-${key}-hint`} className="text-xs text-awm-muted">{hint}</p>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      <fieldset disabled={pending} className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
        <legend className="mb-3 text-sm font-extrabold">{t('identity')}</legend>
        <TextField label={t('nameAr')} value={f.name_ar} onChange={(e) => set('name_ar', e.target.value)} required maxLength={160} lang="ar" dir="rtl" />
        <TextField label={t('nameEn')} value={f.name_en} onChange={(e) => set('name_en', e.target.value)} required maxLength={160} lang="en" dir="ltr" />
        <TextField label={t('taglineAr')} value={f.tagline_ar} onChange={(e) => set('tagline_ar', e.target.value)} maxLength={200} lang="ar" dir="rtl" tag={ta('optional')} />
        <TextField label={t('taglineEn')} value={f.tagline_en} onChange={(e) => set('tagline_en', e.target.value)} maxLength={200} lang="en" dir="ltr" tag={ta('optional')} />
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-da`} className="text-sm font-bold">{t('descAr')}</label>
          <textarea id={`${id}-da`} value={f.desc_ar} onChange={(e) => set('desc_ar', e.target.value)} rows={5} maxLength={5000} lang="ar" dir="rtl" className={area} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-de`} className="text-sm font-bold">{t('descEn')}</label>
          <textarea id={`${id}-de`} value={f.desc_en} onChange={(e) => set('desc_en', e.target.value)} rows={5} maxLength={5000} lang="en" dir="ltr" className={area} />
        </div>
        <TextField label={t('sku')} value={f.sku} onChange={(e) => set('sku', e.target.value)} maxLength={60} dir="ltr" tag={ta('optional')} />
        <TextField label={t('vin')} value={f.vin} onChange={(e) => set('vin', e.target.value.toUpperCase())} maxLength={17} dir="ltr" hint={t('vinHint')} tag={ta('optional')} />
      </fieldset>

      <fieldset disabled={pending} className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-3">
        <legend className="mb-3 text-sm font-extrabold">{t('details')}</legend>
        <TextField label={t('year')} type="number" inputMode="numeric" min="1990" max="2100" value={f.model_year} onChange={(e) => set('model_year', e.target.value)} required dir="ltr" />
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-pt`} className="text-sm font-bold">{t('powertrain')}</label>
          <select id={`${id}-pt`} value={f.powertrain} onChange={(e) => set('powertrain', e.target.value as typeof f.powertrain)} className={select}>
            {POWERTRAINS.map((x) => <option key={x} value={x}>{t(`powertrains.${x}`)}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-body`} className="text-sm font-bold">{t('body')}</label>
          <select id={`${id}-body`} value={f.body_type} onChange={(e) => set('body_type', e.target.value)} className={select}>
            <option value="">{t('none')}</option>
            {BODIES.map((x) => <option key={x} value={x}>{t(`bodies.${x}`)}</option>)}
          </select>
        </div>
        <TextField label={t('color')} value={f.exterior_color} onChange={(e) => set('exterior_color', e.target.value)} maxLength={40} tag={ta('optional')} />
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-cat`} className="text-sm font-bold">{t('category')}</label>
          <select id={`${id}-cat`} value={f.category_id} onChange={(e) => set('category_id', e.target.value)} className={select}>
            <option value="">{t('none')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-branch`} className="text-sm font-bold">{t('branch')}</label>
          <select id={`${id}-branch`} value={f.branch} onChange={(e) => set('branch', e.target.value)} className={select}>
            <option value="">{t('none')}</option>
            <option value="sahnaya">{ta('branch.sahnaya')}</option>
            <option value="kafr_sousa">{ta('branch.kafr_sousa')}</option>
          </select>
        </div>
      </fieldset>

      <fieldset disabled={pending} className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-3">
        <legend className="mb-3 text-sm font-extrabold">{t('pricing')}</legend>
        <TextField label={t('price')} type="number" inputMode="decimal" min="0" step="0.01" value={f.price} onChange={(e) => set('price', e.target.value)} required dir="ltr" />
        <TextField label={t('deposit')} type="number" inputMode="decimal" min="0" step="0.01" value={f.deposit_amount} onChange={(e) => set('deposit_amount', e.target.value)} dir="ltr" hint={t('depositHint')} />
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-cur`} className="text-sm font-bold">{t('currency')}</label>
          <select id={`${id}-cur`} value={f.currency} onChange={(e) => set('currency', e.target.value as 'USD' | 'SYP')} className={select}>
            <option value="USD">USD</option>
            <option value="SYP">SYP</option>
          </select>
        </div>
        <div className="md:col-span-3">{check('show_price', t('showPrice'), t('showPriceHint'))}</div>
      </fieldset>

      <fieldset disabled={pending} className="min-w-0">
        <legend className="mb-3 text-sm font-extrabold">{t('specsTitle')}</legend>
        <SpecsEditor rows={specRows} onChange={(rows) => { setSpecRows(rows); setSaved(false); }} error={specError} />
      </fieldset>

      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
        <legend className="mb-3 text-sm font-extrabold">{t('visibility')}</legend>
        <div className="flex max-w-sm flex-col gap-2">
          <label htmlFor={`${id}-status`} className="text-sm font-bold">{t('status')}</label>
          <select id={`${id}-status`} value={f.status} disabled={reserved} onChange={(e) => set('status', e.target.value as typeof f.status)} className={select} aria-describedby={reserved ? `${id}-status-hint` : undefined}>
            {reserved && <option value="reserved">{t('statuses.reserved')}</option>}
            {(['available', 'incoming', 'sold'] as const).map((x) => <option key={x} value={x}>{t(`statuses.${x}`)}</option>)}
          </select>
          {reserved && <p id={`${id}-status-hint`} className="text-xs text-awm-muted">{t('reservedHint')}</p>}
        </div>
        {check('is_published', t('published'), t('publishedHint'))}
        {check('is_featured', t('featured'), t('featuredHint'))}
        <div className="max-w-40"><TextField label={t('order')} type="number" inputMode="numeric" min="0" value={f.sort_order} onChange={(e) => set('sort_order', e.target.value)} dir="ltr" hint={t('orderHint')} /></div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClasses('primary', 'md')}>{pending ? ta('working') : vehicle ? t('save') : t('create')}</button>
        {saved && <p role="status" className="text-sm font-bold">{t('saved')}</p>}
        {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
      </div>
    </form>
  );
}
