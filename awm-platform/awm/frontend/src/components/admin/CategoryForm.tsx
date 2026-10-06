'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Link } from '@/i18n/navigation';
import type { AdminCategory } from '@/types/admin';
import { useAdminRun } from './useAdminRun';

type Props = { type: 'vehicle' | 'spare_part'; category?: AdminCategory; parents: AdminCategory[] };

/** Add a category, or edit one (names in both languages, parent for sub-categories, on/off, order). */
export function CategoryForm({ type, category, parents }: Props) {
  const t = useTranslations('admin.categories.form');
  const ta = useTranslations('admin');
  const { run, pending, error } = useAdminRun();
  const id = useId();
  const [done, setDone] = useState(false);
  const [f, setF] = useState({
    name_ar: category?.name.ar ?? '',
    name_en: category?.name.en ?? '',
    slug: category?.slug ?? '',
    parent_id: category?.parent_id ? String(category.parent_id) : '',
    sort_order: String(category?.sort_order ?? 0),
    is_active: category?.is_active ?? true,
  });
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => { setF((p) => ({ ...p, [key]: value })); setDone(false); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      ...(category ? {} : { type }),
      name: { ar: f.name_ar.trim(), en: f.name_en.trim() },
      slug: f.slug.trim() || null,
      parent_id: f.parent_id ? Number(f.parent_id) : null,
      sort_order: Number(f.sort_order) || 0,
      is_active: f.is_active,
    };
    const r = category ? await run('PUT', `categories/${category.id}`, body) : await run('POST', 'categories', body);
    if (r.ok) {
      setDone(true);
      if (!category) setF({ name_ar: '', name_en: '', slug: '', parent_id: '', sort_order: '0', is_active: true });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <TextField label={t('nameAr')} value={f.name_ar} onChange={(e) => set('name_ar', e.target.value)} required maxLength={120} lang="ar" dir="rtl" />
      <TextField label={t('nameEn')} value={f.name_en} onChange={(e) => set('name_en', e.target.value)} required maxLength={120} lang="en" dir="ltr" />
      <TextField label={t('slug')} value={f.slug} onChange={(e) => set('slug', e.target.value)} maxLength={80} dir="ltr" hint={t('slugHint')} tag={ta('optional')} />
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-parent`} className="text-sm font-bold">{t('parent')}</label>
        <select id={`${id}-parent`} value={f.parent_id} onChange={(e) => set('parent_id', e.target.value)} className="h-12 w-full border border-awm-line bg-white px-3 text-base">
          <option value="">{t('noParent')}</option>
          {parents.filter((p) => p.id !== category?.id).map((p) => <option key={p.id} value={p.id}>{p.name.ar ?? p.name.en} / {p.name.en ?? p.name.ar}</option>)}
        </select>
      </div>
      <TextField label={t('order')} type="number" inputMode="numeric" min="0" value={f.sort_order} onChange={(e) => set('sort_order', e.target.value)} dir="ltr" hint={t('orderHint')} />
      <div className="flex items-start gap-3 md:self-end md:pb-3">
        <input id={`${id}-active`} type="checkbox" checked={f.is_active} onChange={(e) => set('is_active', e.target.checked)} className="mt-1 size-5 accent-awm-red" aria-describedby={`${id}-active-hint`} />
        <div>
          <label htmlFor={`${id}-active`} className="text-sm font-bold">{t('active')}</label>
          <p id={`${id}-active-hint`} className="text-xs text-awm-muted">{t('activeHint')}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 md:col-span-2">
        <button type="submit" disabled={pending} className={buttonClasses('primary', 'md')}>{pending ? ta('working') : category ? t('save') : t('add')}</button>
        {category && <Link href={{ pathname: '/admin/categories', query: { type } }} className="text-sm font-bold text-awm-red underline underline-offset-4">{t('cancel')}</Link>}
        {done && <p role="status" className="text-sm font-bold">{t('saved')}</p>}
        {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
      </div>
    </form>
  );
}
