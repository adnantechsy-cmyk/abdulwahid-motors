'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { AdminPartFull } from '@/types/admin';
import type { CategoryDto } from '@/types/api';

export function PartForm({ part }: { part?: AdminPartFull }) {
  const t = useTranslations('admin.partForm');
  const locale = useLocale();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<CategoryDto[]>('/categories?type=spare_part', { locale }).then(setCategories).catch(() => setCategories([]));
  }, [locale]);

  const err = (k: string) => errors[k]?.[0];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => ((f.get(k) as string) ?? '').trim();
    const body: Record<string, unknown> = {
      sku: str('sku').toUpperCase(),
      oem_number: str('oem_number') || null,
      name: { ar: str('name_ar'), en: str('name_en') },
      description: { ar: str('description_ar'), en: str('description_en') },
      category_id: str('category_id') ? Number(str('category_id')) : null,
      price: str('price'),
      cost_price: str('cost_price') || null,
      currency: str('currency'),
      is_oem: f.get('is_oem') === 'on',
      compatible_models: str('compatible_models').split(/[,،\n]/).map((s) => s.trim()).filter(Boolean),
      low_stock_threshold: Number(str('low_stock_threshold') || 0),
      bin_location: str('bin_location') || null,
      is_published: f.get('is_published') === 'on',
      hide_when_out_of_stock: f.get('hide_when_out_of_stock') === 'on',
    };
    if (!part) body.initial_stock = Number(str('initial_stock') || 0);

    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const saved = await apiFetch<{ id: number }>(part ? `/admin/parts/${part.id}` : '/admin/parts', { method: part ? 'PUT' : 'POST', body: JSON.stringify(body), locale });
      router.push({ pathname: '/admin/parts', query: { selected: saved.id } });
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.errors) setErrors(e.errors);
      setMessage(e instanceof ApiError ? e.message : t('genericError'));
      setSaving(false);
    }
  }

  const p = part;
  return (
    <form onSubmit={onSubmit} className="flex max-w-4xl flex-col gap-8" noValidate>
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="marker-square mb-4 text-lg font-extrabold">{t('identity')}</legend>
        <Field label={t('sku')} error={err('sku')}><Input name="sku" dir="ltr" required defaultValue={p?.sku} className="font-mono uppercase" /></Field>
        <Field label={t('oem')} error={err('oem_number')}><Input name="oem_number" dir="ltr" defaultValue={p?.oem_number ?? ''} className="font-mono" /></Field>
        <Field label={t('nameAr')} error={err('name.ar')}><Input name="name_ar" dir="rtl" required defaultValue={p?.name.ar} /></Field>
        <Field label={t('nameEn')} error={err('name.en')}><Input name="name_en" dir="ltr" required defaultValue={p?.name.en} /></Field>
        <Field label={t('category')} error={err('category_id')}>
          <Select name="category_id" defaultValue={p?.category_id ?? ''}>
            <option value="">{t('none')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label={t('models')} hint={t('modelsHint')}><Input name="compatible_models" defaultValue={p?.compatible_models?.join(', ') ?? ''} /></Field>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="marker-square mb-4 text-lg font-extrabold">{t('pricing')}</legend>
        <Field label={t('price')} error={err('price')}><Input name="price" inputMode="decimal" required defaultValue={p?.price} className="font-mono" /></Field>
        <Field label={t('cost')} hint={t('costHint')} error={err('cost_price')}><Input name="cost_price" inputMode="decimal" defaultValue={p?.cost_price ?? ''} className="font-mono" /></Field>
        <Field label={t('currency')}><Select name="currency" defaultValue={p?.currency ?? 'USD'}><option value="USD">USD</option><option value="SYP">SYP</option></Select></Field>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="marker-square mb-4 text-lg font-extrabold">{t('warehouse')}</legend>
        <Field label={t('bin')}><Input name="bin_location" dir="ltr" defaultValue={p?.bin_location ?? ''} className="font-mono uppercase" placeholder="R-08-C1" /></Field>
        <Field label={t('threshold')}><Input name="low_stock_threshold" type="number" min={0} defaultValue={p?.low_stock_threshold ?? 2} className="font-mono" /></Field>
        {!p && <Field label={t('initialStock')} hint={t('initialHint')}><Input name="initial_stock" type="number" min={0} defaultValue={0} className="font-mono" /></Field>}
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="marker-square mb-4 text-lg font-extrabold">{t('description')}</legend>
        <Field label={t('descriptionAr')}><Textarea name="description_ar" dir="rtl" rows={5} defaultValue={p?.description.ar} /></Field>
        <Field label={t('descriptionEn')}><Textarea name="description_en" dir="ltr" rows={5} defaultValue={p?.description.en} /></Field>
      </fieldset>

      <fieldset className="flex flex-wrap gap-6">
        <legend className="sr-only">{t('flags')}</legend>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_oem" defaultChecked={p?.is_oem ?? true} className="size-5 accent-awm-red" />{t('isOem')}</label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_published" defaultChecked={p?.is_published ?? false} className="size-5 accent-awm-red" />{t('published')}</label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="hide_when_out_of_stock" defaultChecked={p?.hide_when_out_of_stock ?? false} className="size-5 accent-awm-red" />{t('autoHide')}</label>
      </fieldset>

      {message && <p role="alert" className="border-s-4 border-awm-red bg-awm-red/5 p-3 text-sm">{message}</p>}
      <div className="flex gap-2 border-t border-awm-line pt-6">
        <Button type="submit" size="lg" disabled={saving}>{saving ? t('saving') : p ? t('saveChanges') : t('create')}</Button>
        <Button size="lg" variant="ghost" onClick={() => router.back()}>{t('cancel')}</Button>
      </div>
    </form>
  );
}
