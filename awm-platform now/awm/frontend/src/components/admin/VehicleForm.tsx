'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { AdminVehicleFull } from '@/types/admin';
import type { CategoryDto } from '@/types/api';

type Errors = Record<string, string[]>;
const SPEC_KEYS = ['battery_kwh', 'range_km', 'power_kw', 'seats'] as const;

export function VehicleForm({ vehicle }: { vehicle?: AdminVehicleFull }) {
  const t = useTranslations('admin.vehicleForm');
  const tv = useTranslations('admin.vehicles');
  const locale = useLocale();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<CategoryDto[]>('/categories?type=vehicle', { locale }).then(setCategories).catch(() => setCategories([]));
  }, [locale]);

  const err = (k: string) => errors[k]?.[0];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => ((f.get(k) as string) ?? '').trim();
    const opt = (k: string) => str(k) || null;
    const specs = Object.fromEntries(SPEC_KEYS.map((k) => [k, str(`spec_${k}`)]).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]));

    const body = {
      name: { ar: str('name_ar'), en: str('name_en') },
      tagline: { ar: str('tagline_ar'), en: str('tagline_en') },
      description: { ar: str('description_ar'), en: str('description_en') },
      model_year: Number(str('model_year')),
      powertrain: str('powertrain'),
      body_type: opt('body_type'),
      exterior_color: opt('exterior_color'),
      vin: opt('vin')?.toUpperCase() ?? null,
      sku: opt('sku'),
      category_id: opt('category_id') ? Number(str('category_id')) : null,
      price: str('price'),
      deposit_amount: str('deposit_amount'),
      currency: str('currency'),
      branch: opt('branch'),
      specs,
      is_published: f.get('is_published') === 'on',
      is_featured: f.get('is_featured') === 'on',
    };

    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const saved = await apiFetch<{ id: number }>(vehicle ? `/admin/vehicles/${vehicle.id}` : '/admin/vehicles', {
        method: vehicle ? 'PUT' : 'POST', body: JSON.stringify(body), locale,
      });
      router.push({ pathname: '/admin/vehicles', query: { selected: saved.id } });
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.errors) setErrors(e.errors);
      setMessage(e instanceof ApiError ? e.message : t('genericError'));
      setSaving(false);
    }
  }

  const v = vehicle;
  return (
    <form onSubmit={onSubmit} className="flex max-w-4xl flex-col gap-8" noValidate>
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="marker-square mb-4 text-lg font-extrabold">{t('identity')}</legend>
        <Field label={t('nameAr')} error={err('name.ar')}><Input name="name_ar" dir="rtl" required defaultValue={v?.name.ar} /></Field>
        <Field label={t('nameEn')} error={err('name.en')}><Input name="name_en" dir="ltr" required defaultValue={v?.name.en} /></Field>
        <Field label={t('taglineAr')}><Input name="tagline_ar" dir="rtl" defaultValue={v?.tagline.ar} /></Field>
        <Field label={t('taglineEn')}><Input name="tagline_en" dir="ltr" defaultValue={v?.tagline.en} /></Field>
        <Field label={t('modelYear')} error={err('model_year')}><Input name="model_year" type="number" inputMode="numeric" required defaultValue={v?.model_year ?? new Date().getFullYear()} className="font-mono" /></Field>
        <Field label={t('powertrain')} error={err('powertrain')}>
          <Select name="powertrain" defaultValue={v?.powertrain ?? 'bev'}>
            {(['bev', 'phev', 'hev', 'ice'] as const).map((p) => <option key={p} value={p}>{tv(`powertrain.${p}`)}</option>)}
          </Select>
        </Field>
        <Field label={t('category')} error={err('category_id')}>
          <Select name="category_id" defaultValue={v?.category_id ?? ''}>
            <option value="">{t('none')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label={t('bodyType')}><Input name="body_type" defaultValue={v?.body_type ?? ''} placeholder="sedan / suv" /></Field>
        <Field label={t('color')}><Input name="exterior_color" defaultValue={v?.exterior_color ?? ''} /></Field>
        <Field label="VIN" hint={t('vinHint')} error={err('vin')}><Input name="vin" dir="ltr" maxLength={17} defaultValue={v?.vin ?? ''} className="font-mono uppercase" /></Field>
        <Field label={t('sku')} error={err('sku')}><Input name="sku" dir="ltr" defaultValue={v?.sku ?? ''} className="font-mono" /></Field>
        <Field label={t('branch')} error={err('branch')}>
          <Select name="branch" defaultValue={v?.branch ?? ''}>
            <option value="">{t('none')}</option>
            <option value="sahnaya">{tv('branches.sahnaya')}</option>
            <option value="kafr_sousa">{tv('branches.kafr_sousa')}</option>
          </Select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="marker-square mb-4 text-lg font-extrabold">{t('pricing')}</legend>
        <Field label={t('price')} error={err('price')}><Input name="price" inputMode="decimal" required defaultValue={v?.price} className="font-mono" /></Field>
        <Field label={t('deposit')} hint={t('depositHint')} error={err('deposit_amount')}><Input name="deposit_amount" inputMode="decimal" required defaultValue={v?.deposit_amount ?? '0'} className="font-mono" /></Field>
        <Field label={t('currency')} error={err('currency')}>
          <Select name="currency" defaultValue={v?.currency ?? 'USD'}><option value="USD">USD</option><option value="SYP">SYP</option></Select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-4">
        <legend className="marker-square mb-4 text-lg font-extrabold">{t('specs')}</legend>
        {SPEC_KEYS.map((k) => (
          <Field key={k} label={t(`spec.${k}`)}><Input name={`spec_${k}`} inputMode="decimal" defaultValue={v?.specs?.[k] ?? ''} className="font-mono" /></Field>
        ))}
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="marker-square mb-4 text-lg font-extrabold">{t('description')}</legend>
        <Field label={t('descriptionAr')}><Textarea name="description_ar" dir="rtl" rows={6} defaultValue={v?.description.ar} /></Field>
        <Field label={t('descriptionEn')}><Textarea name="description_en" dir="ltr" rows={6} defaultValue={v?.description.en} /></Field>
      </fieldset>

      <fieldset className="flex flex-wrap gap-6">
        <legend className="sr-only">{t('visibility')}</legend>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_published" defaultChecked={v?.is_published ?? false} className="size-5 accent-awm-red" />{t('published')}</label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_featured" defaultChecked={v?.is_featured ?? false} className="size-5 accent-awm-red" />{t('featured')}</label>
      </fieldset>

      {message && <p role="alert" className="border-s-4 border-awm-red bg-awm-red/5 p-3 text-sm">{message}</p>}

      <div className="flex gap-2 border-t border-awm-line pt-6">
        <Button type="submit" size="lg" disabled={saving}>{saving ? t('saving') : vehicle ? t('saveChanges') : t('create')}</Button>
        <Button size="lg" variant="ghost" onClick={() => router.back()}>{t('cancel')}</Button>
      </div>
    </form>
  );
}
