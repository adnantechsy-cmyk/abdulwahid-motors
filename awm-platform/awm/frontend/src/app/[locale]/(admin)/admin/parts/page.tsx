import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EmptyNote, Panel, TableScroll, td, th } from '@/components/account/Panel';
import { Pagination } from '@/components/catalog/Pagination';
import { ButtonLink } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { adminGet, can, requirePermission } from '@/lib/api/admin';
import { formatMoneyAuto, formatNumber } from '@/lib/format';
import { oneOf, pageParam, param, toQuery } from '@/lib/listing';
import type { LaravelPage } from '@/types/account';
import type { AdminPart, PartCategory } from '@/types/admin';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const STOCK = ['low', 'out', 'ok'] as const;

export default async function PartsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePermission(locale, 'parts.manage', 'stock.adjust');

  const raw = await searchParams;
  const stock = oneOf(param(raw, 'stock'), STOCK);
  const published = oneOf(param(raw, 'published'), ['0', '1'] as const);
  const q = param(raw, 'q')?.slice(0, 60);
  const categoryRaw = param(raw, 'category');
  const category = categoryRaw && /^\d{1,9}$/.test(categoryRaw) ? categoryRaw : undefined;
  const page = pageParam(raw);

  const query = new URLSearchParams({ page: String(page), ...(stock ? { stock } : {}), ...(published ? { published } : {}), ...(q ? { q } : {}), ...(category ? { category } : {}) });
  const [t, list, categories] = await Promise.all([
    getTranslations('admin.parts'),
    adminGet<LaravelPage<AdminPart>>(`/admin/parts?${query}`, locale),
    adminGet<PartCategory[]>('/admin/part-categories', locale),
  ]);

  const n = (v: number) => formatNumber(v, locale);
  const chip = (active: boolean) => `inline-flex h-9 items-center whitespace-nowrap border px-4 text-sm font-bold ${active ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line bg-white hover:border-awm-black'}`;
  const href = (next: { stock?: string | undefined }) => ({ pathname: '/admin/parts' as const, query: toQuery({ stock: 'stock' in next ? next.stock : stock, published, q, category }) });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{t('title')}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('intro')}</p>
        </div>
        {can(user, 'parts.manage') && <ButtonLink href="/admin/parts/new" variant="primary" size="md">{t('add')}</ButtonLink>}
      </div>

      <form role="search" aria-label={t('filtersLabel')} action={`/${locale}/admin/parts`} className="flex flex-wrap items-end gap-3">
        {stock && <input type="hidden" name="stock" value={stock} />}
        <div className="flex flex-col gap-1">
          <label htmlFor="part-q" className="text-xs font-bold">{t('search')}</label>
          <input id="part-q" name="q" defaultValue={q} maxLength={60} className="h-9 w-64 max-w-full border border-awm-line bg-white px-3 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="part-cat" className="text-xs font-bold">{t('category')}</label>
          <select id="part-cat" name="category" defaultValue={category ?? ''} className="h-9 border border-awm-line bg-white px-2 text-sm">
            <option value="">{t('allCategories')}</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="part-pub" className="text-xs font-bold">{t('visibility')}</label>
          <select id="part-pub" name="published" defaultValue={published ?? ''} className="h-9 border border-awm-line bg-white px-2 text-sm">
            <option value="">{t('anyVisibility')}</option>
            <option value="1">{t('published')}</option>
            <option value="0">{t('hidden')}</option>
          </select>
        </div>
        <button type="submit" className="h-9 border border-awm-black bg-awm-black px-4 text-sm font-bold text-white">{t('apply')}</button>
      </form>

      <nav aria-label={t('stockLabel')} className="flex flex-wrap gap-2">
        <Link href={href({ stock: undefined })} aria-current={!stock ? 'true' : undefined} className={chip(!stock)}>{t('stockAll')}</Link>
        {STOCK.map((x) => <Link key={x} href={href({ stock: x })} aria-current={stock === x ? 'true' : undefined} className={chip(stock === x)}>{t(`stockFilter.${x}`)}</Link>)}
      </nav>

      <Panel id="parts-list" title={t('listTitle')}>
        {list && list.data.length > 0 ? (
          <>
            <TableScroll label={t('listTitle')}>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={th}>{t('cols.part')}</th>
                    <th scope="col" className={th}>{t('cols.category')}</th>
                    <th scope="col" className={th}>{t('cols.price')}</th>
                    <th scope="col" className={th}>{t('cols.onHand')}</th>
                    <th scope="col" className={th}>{t('cols.available')}</th>
                    <th scope="col" className={th}>{t('cols.visibility')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((p) => (
                    <tr key={p.id} className="align-top">
                      <th scope="row" className={`${td} text-start`}>
                        <Link href={`/admin/parts/${p.id}`} className="font-bold text-awm-red underline underline-offset-4">{p.display_name}</Link>
                        <span className="block font-mono text-xs font-normal text-awm-muted" dir="ltr">{p.sku}</span>
                      </th>
                      <td className={td}>{p.category?.name ?? '—'}</td>
                      <td className={`${td} whitespace-nowrap font-mono font-bold tabular-nums`}>{formatMoneyAuto(p.price, p.currency, locale)}</td>
                      <td className={`${td} font-mono tabular-nums`}>{n(p.stock_quantity)}{p.reserved_quantity > 0 && <span className="block text-xs font-normal text-awm-muted">{t('reserved', { count: n(p.reserved_quantity) })}</span>}</td>
                      <td className={td}>
                        <span className="font-mono font-bold tabular-nums">{n(p.available_quantity)}</span>
                        {p.available_quantity <= 0 ? (
                          <span className="ms-2 bg-awm-black px-2 py-0.5 text-xs font-bold text-white">{t('outOfStock')}</span>
                        ) : p.is_low_stock ? (
                          <span className="ms-2 bg-awm-red px-2 py-0.5 text-xs font-bold text-white">{t('lowStock')}</span>
                        ) : null}
                      </td>
                      <td className={td}>{p.is_published ? t('published') : t('hidden')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <Pagination current={list.current_page} last={list.last_page} href={(num) => ({ pathname: '/admin/parts', query: toQuery({ stock, published, q, category, page: num }) })} />
          </>
        ) : (
          <EmptyNote>{t('empty')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}
