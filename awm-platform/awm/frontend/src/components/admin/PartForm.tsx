'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useRouter } from '@/i18n/navigation';
import type { AdminPartDetail, PartCategory } from '@/types/admin';
import { useAdminRun } from './useAdminRun';

type Props = { part?: AdminPartDetail; categories: PartCategory[]; canEdit: boolean };

const area = 'w-full border border-awm-line bg-white p-3 text-base focus-visible:outline-3 focus-visible:outline-awm-red';

/**
 * Create or edit a spare part, in Arabic and English. The SKU is fixed once saved and stock is not edited here
 * (it changes only through the stock panel, which keeps the audit log complete).
 */
export function PartForm({ part, categories, canEdit }: Props) {
  const t = useTranslations('admin.parts.form');
  const ta = useTranslations('admin');
  const router = useRouter();
  const { run, pending, error } = useAdminRun();
  const id = useId();
  const [saved, setSaved] = useState(false);

  const [f, setF] = useState({
    sku: part?.sku ?? '',
    oem_number: part?.oem_number ?? '',
    name_ar: part?.name.ar ?? '',
    name_en: part?.name.en ?? '',
    desc_ar: part?.description.ar ?? '',
    desc_en: part?.description.en ?? '',
    category_id: part?.category?.id ? String(part.category.id) : '',
    price: part?.price ?? '',
    cost_price: part?.cost_price ?? '',
    currency: part?.currency ?? 'USD',
    is_oem: part?.is_oem ?? true,
    models: (part?.compatible_models ?? []).join('\n'),
    low_stock_threshold: String(part?.low_stock_threshold ?? 2),
    bin_location: part?.bin_location ?? '',
    is_published: part?.is_published ?? false,
    hide_when_out_of_stock: part?.hide_when_out_of_stock ?? false,
    initial_stock: '0',
  });
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => { setF((p) => ({ ...p, [key]: value })); setSaved(false); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      ...(part ? {} : { sku: f.sku.trim(), initial_stock: Number(f.initial_stock) || 0 }),
      oem_number: f.oem_number.trim() || null,
      name: { ar: f.name_ar.trim(), en: f.name_en.trim() },
      description: { ar: f.desc_ar.trim() || null, en: f.desc_en.trim() || null },
      category_id: f.category_id ? Number(f.category_id) : null,
      price: f.price,
      cost_price: f.cost_price === '' ? null : f.cost_price,
      currency: f.currency,
      is_oem: f.is_oem,
      compatible_models: f.models.split(/[\n,]/).map((m) => m.trim()).filter(Boolean),
      low_stock_threshold: Number(f.low_stock_threshold) || 0,
      bin_location: f.bin_location.trim() || null,
      is_published: f.is_published,
      hide_when_out_of_stock: f.hide_when_out_of_stock,
    };

    if (part) {
      const r = await run('PUT', `parts/${part.id}`, body);
      if (r.ok) setSaved(true);
    } else {
      const r = await run<{ id: number }>('POST', 'parts', body);
      if (r.ok) router.push(`/admin/parts/${r.data.id}`);
    }
  }

  const check = (key: 'is_oem' | 'is_published' | 'hide_when_out_of_stock', label: string, hint?: string) => (
    <div className="flex items-start gap-3">
      <input id={`${id}-${key}`} type="checkbox" checked={f[key]} disabled={!canEdit} onChange={(e) => set(key, e.target.checked)} className="mt-1 size-5 accent-awm-red" aria-describedby={hint ? `${id}-${key}-hint` : undefined} />
      <div>
        <label htmlFor={`${id}-${key}`} className="text-sm font-bold">{label}</label>
        {hint && <p id={`${id}-${key}-hint`} className="text-xs text-awm-muted">{hint}</p>}
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-8" noValidate>
      <fieldset disabled={!canEdit || pending} className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
        <legend className="mb-3 text-sm font-extrabold">{t('identity')}</legend>
        {part ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold">{t('sku')}</span>
            <span className="flex h-12 items-center bg-awm-panel px-4 font-mono" dir="ltr">{part.sku}</span>
            <span className="text-xs text-awm-muted">{t('skuFixed')}</span>
          </div>
        ) : (
          <TextField label={t('sku')} value={f.sku} onChange={(e) => set('sku', e.target.value)} required maxLength={100} dir="ltr" hint={t('skuHint')} />
        )}
        <TextField label={t('oem')} value={f.oem_number} onChange={(e) => set('oem_number', e.target.value)} maxLength={100} dir="ltr" tag={ta('optional')} />
        <TextField label={t('nameAr')} value={f.name_ar} onChange={(e) => set('name_ar', e.target.value)} required maxLength={200} lang="ar" dir="rtl" />
        <TextField label={t('nameEn')} value={f.name_en} onChange={(e) => set('name_en', e.target.value)} required maxLength={200} lang="en" dir="ltr" />
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-da`} className="text-sm font-bold">{t('descAr')}</label>
          <textarea id={`${id}-da`} value={f.desc_ar} onChange={(e) => set('desc_ar', e.target.value)} rows={4} maxLength={3000} lang="ar" dir="rtl" className={area} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-de`} className="text-sm font-bold">{t('descEn')}</label>
          <textarea id={`${id}-de`} value={f.desc_en} onChange={(e) => set('desc_en', e.target.value)} rows={4} maxLength={3000} lang="en" dir="ltr" className={area} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-cat`} className="text-sm font-bold">{t('category')}</label>
          <select id={`${id}-cat`} value={f.category_id} onChange={(e) => set('category_id', e.target.value)} className="h-12 w-full border border-awm-line bg-white px-3">
            <option value="">{t('noCategory')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-models`} className="text-sm font-bold">{t('models')}</label>
          <textarea id={`${id}-models`} value={f.models} onChange={(e) => set('models', e.target.value)} rows={3} dir="ltr" className={area} aria-describedby={`${id}-models-hint`} />
          <p id={`${id}-models-hint`} className="text-xs text-awm-muted">{t('modelsHint')}</p>
        </div>
      </fieldset>

      <fieldset disabled={!canEdit || pending} className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-3">
        <legend className="mb-3 text-sm font-extrabold">{t('pricing')}</legend>
        <TextField label={t('price')} type="number" inputMode="decimal" min="0" step="0.01" value={f.price} onChange={(e) => set('price', e.target.value)} required dir="ltr" />
        <TextField label={t('cost')} type="number" inputMode="decimal" min="0" step="0.01" value={f.cost_price} onChange={(e) => set('cost_price', e.target.value)} dir="ltr" hint={t('costHint')} tag={ta('optional')} />
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-cur`} className="text-sm font-bold">{t('currency')}</label>
          <select id={`${id}-cur`} value={f.currency} onChange={(e) => set('currency', e.target.value as 'USD' | 'SYP')} className="h-12 w-full border border-awm-line bg-white px-3">
            <option value="USD">USD</option>
            <option value="SYP">SYP</option>
          </select>
        </div>
      </fieldset>

      <fieldset disabled={!canEdit || pending} className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-3">
        <legend className="mb-3 text-sm font-extrabold">{t('stockSection')}</legend>
        {!part && <TextField label={t('initialStock')} type="number" inputMode="numeric" min="0" step="1" value={f.initial_stock} onChange={(e) => set('initial_stock', e.target.value)} dir="ltr" hint={t('initialStockHint')} />}
        <TextField label={t('threshold')} type="number" inputMode="numeric" min="0" step="1" value={f.low_stock_threshold} onChange={(e) => set('low_stock_threshold', e.target.value)} dir="ltr" hint={t('thresholdHint')} />
        <TextField label={t('bin')} value={f.bin_location} onChange={(e) => set('bin_location', e.target.value)} maxLength={40} dir="ltr" tag={ta('optional')} />
      </fieldset>

      <fieldset disabled={!canEdit || pending} className="flex min-w-0 flex-col gap-4">
        <legend className="mb-3 text-sm font-extrabold">{t('visibility')}</legend>
        {check('is_published', t('published'), t('publishedHint'))}
        {check('hide_when_out_of_stock', t('hideOut'), t('hideOutHint'))}
        {check('is_oem', t('isOem'))}
      </fieldset>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={pending} className={buttonClasses('primary', 'md')}>{pending ? ta('working') : part ? t('save') : t('create')}</button>
          {saved && <p role="status" className="text-sm font-bold text-awm-black">{t('saved')}</p>}
          {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
        </div>
      )}
    </form>
  );
}
