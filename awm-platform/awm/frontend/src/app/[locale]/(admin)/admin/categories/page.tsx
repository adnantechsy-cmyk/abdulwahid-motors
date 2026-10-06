import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { DeleteCategory } from '@/components/admin/DeleteCategory';
import { EmptyNote, Panel, TableScroll, td, th } from '@/components/account/Panel';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { formatNumber } from '@/lib/format';
import { oneOf, param } from '@/lib/listing';
import type { AdminCategory } from '@/types/admin';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const TYPES = ['spare_part', 'vehicle'] as const;

export default async function CategoriesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'categories.manage');

  const raw = await searchParams;
  const type = oneOf(param(raw, 'type'), TYPES) ?? 'spare_part';
  const editRaw = param(raw, 'edit');
  const editId = editRaw && /^\d{1,9}$/.test(editRaw) ? Number(editRaw) : null;

  const [t, categories] = await Promise.all([getTranslations('admin.categories'), adminGet<AdminCategory[]>(`/admin/categories?type=${type}`, locale)]);
  const all = categories ?? [];
  const editing = editId ? all.find((c) => c.id === editId) : undefined;
  const nameOf = (id: number | null) => {
    const c = all.find((x) => x.id === id);
    return c ? (locale === 'ar' ? (c.name.ar ?? c.name.en) : (c.name.en ?? c.name.ar)) : '—';
  };
  const label = (c: AdminCategory) => (locale === 'ar' ? (c.name.ar ?? c.name.en) : (c.name.en ?? c.name.ar)) ?? '';

  const chip = (active: boolean) => `inline-flex h-9 items-center whitespace-nowrap border px-4 text-sm font-bold ${active ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line bg-white hover:border-awm-black'}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">{t('title')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('intro')}</p>
      </div>

      <nav aria-label={t('typeLabel')} className="flex flex-wrap gap-2">
        {TYPES.map((x) => (
          <Link key={x} href={{ pathname: '/admin/categories', query: { type: x } }} aria-current={type === x ? 'page' : undefined} className={chip(type === x)}>{t(`types.${x}`)}</Link>
        ))}
      </nav>

      <Panel id="category-form" title={editing ? t('editTitle', { name: label(editing) }) : t('addTitle', { type: t(`types.${type}`) })}>
        <CategoryForm key={`${type}-${editing?.id ?? 'new'}`} type={type} category={editing} parents={all.filter((c) => c.parent_id === null)} />
      </Panel>

      <Panel id="category-list" title={t(`types.${type}`)}>
        {all.length > 0 ? (
          <TableScroll label={t(`types.${type}`)}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={th}>{t('cols.name')}</th>
                  <th scope="col" className={th}>{t('cols.parent')}</th>
                  <th scope="col" className={th}>{t('cols.items')}</th>
                  <th scope="col" className={th}>{t('cols.status')}</th>
                  <th scope="col" className={th}>{t('cols.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {all.map((c) => (
                  <tr key={c.id} className="align-top">
                    <th scope="row" className={`${td} text-start`}>
                      {c.name.ar ?? '—'} <span className="font-normal text-awm-muted">/ {c.name.en ?? '—'}</span>
                      <span className="block font-mono text-xs font-normal text-awm-muted" dir="ltr">{c.slug}</span>
                    </th>
                    <td className={td}>{c.parent_id ? nameOf(c.parent_id) : '—'}</td>
                    <td className={`${td} font-mono tabular-nums`}>{formatNumber(c.items_count, locale)}</td>
                    <td className={td}>{c.is_active ? t('active') : t('inactive')}</td>
                    <td className={td}>
                      <div className="flex flex-wrap items-start gap-2">
                        <Link href={{ pathname: '/admin/categories', query: { type, edit: c.id } }} className="inline-flex h-9 items-center border-2 border-awm-black px-3 text-xs font-bold hover:bg-awm-black hover:text-white">
                          {t('edit')}<span className="sr-only"> {label(c)}</span>
                        </Link>
                        <DeleteCategory id={c.id} name={label(c)} itemsCount={c.items_count} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <EmptyNote>{t('empty')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}
