import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EmptyNote, Panel, TableScroll, td, th } from '@/components/account/Panel';
import { StatusPill } from '@/components/account/StatusPill';
import { Pagination } from '@/components/catalog/Pagination';
import { ButtonLink } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { formatMoneyAuto } from '@/lib/format';
import { oneOf, pageParam, param, toQuery } from '@/lib/listing';
import type { LaravelPage } from '@/types/account';
import type { AdminVehicleRow } from '@/types/admin';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const STATUSES = ['available', 'incoming', 'reserved', 'sold'] as const;

export default async function VehiclesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'vehicles.manage');

  const raw = await searchParams;
  const status = oneOf(param(raw, 'status'), STATUSES);
  const published = oneOf(param(raw, 'published'), ['0', '1'] as const);
  const q = param(raw, 'q')?.slice(0, 60);
  const page = pageParam(raw);

  const query = new URLSearchParams({ page: String(page), ...(status ? { status } : {}), ...(published ? { published } : {}), ...(q ? { q } : {}) });
  const [t, list] = await Promise.all([getTranslations('admin.vehicles'), adminGet<LaravelPage<AdminVehicleRow>>(`/admin/vehicles?${query}`, locale)]);

  const chip = (active: boolean) => `inline-flex h-9 items-center whitespace-nowrap border px-4 text-sm font-bold ${active ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line bg-white hover:border-awm-black'}`;
  const href = (next: string | undefined) => ({ pathname: '/admin/vehicles' as const, query: toQuery({ status: next, published, q }) });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{t('title')}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('intro')}</p>
        </div>
        <ButtonLink href="/admin/vehicles/new" variant="primary" size="md">{t('add')}</ButtonLink>
      </div>

      <form role="search" aria-label={t('filtersLabel')} action={`/${locale}/admin/vehicles`} className="flex flex-wrap items-end gap-3">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="flex flex-col gap-1">
          <label htmlFor="veh-q" className="text-xs font-bold">{t('search')}</label>
          <input id="veh-q" name="q" defaultValue={q} maxLength={60} className="h-9 w-64 max-w-full border border-awm-line bg-white px-3 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="veh-pub" className="text-xs font-bold">{t('visibility')}</label>
          <select id="veh-pub" name="published" defaultValue={published ?? ''} className="h-9 border border-awm-line bg-white px-2 text-sm">
            <option value="">{t('anyVisibility')}</option>
            <option value="1">{t('published')}</option>
            <option value="0">{t('hidden')}</option>
          </select>
        </div>
        <button type="submit" className="h-9 border border-awm-black bg-awm-black px-4 text-sm font-bold text-white">{t('apply')}</button>
      </form>

      <nav aria-label={t('statusLabel')} className="flex flex-wrap gap-2">
        <Link href={href(undefined)} aria-current={!status ? 'true' : undefined} className={chip(!status)}>{t('allStatuses')}</Link>
        {STATUSES.map((x) => <Link key={x} href={href(x)} aria-current={status === x ? 'true' : undefined} className={chip(status === x)}>{t(`statuses.${x}`)}</Link>)}
      </nav>

      <Panel id="vehicles-list" title={t('listTitle')}>
        {list && list.data.length > 0 ? (
          <>
            <TableScroll label={t('listTitle')}>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={th}>{t('cols.car')}</th>
                    <th scope="col" className={th}>{t('cols.price')}</th>
                    <th scope="col" className={th}>{t('cols.status')}</th>
                    <th scope="col" className={th}>{t('cols.website')}</th>
                    <th scope="col" className={th}>{t('cols.files')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((v) => (
                    <tr key={v.id} className="align-top">
                      <th scope="row" className={`${td} text-start`}>
                        <Link href={`/admin/vehicles/${v.id}`} className="font-bold text-awm-red underline underline-offset-4">{v.display_name}</Link>
                        <span className="block text-xs font-normal text-awm-muted">{v.model_year}{v.sku ? ` · ${v.sku}` : ''}</span>
                      </th>
                      <td className={`${td} whitespace-nowrap font-mono tabular-nums`}>
                        {formatMoneyAuto(v.price, v.currency, locale)}
                        {!v.show_price && <span className="block font-sans text-xs text-awm-muted">{t('priceHidden')}</span>}
                      </td>
                      <td className={td}><StatusPill code={v.status} label={t(`statuses.${v.status}`)} /></td>
                      <td className={td}>{v.is_published ? t('published') : t('hidden')}</td>
                      <td className={td}>
                        <span className="block text-xs">{v.has_cover ? t('hasCover') : t('noCover')}</span>
                        <span className="block text-xs">{v.has_brochure ? t('hasBrochure') : t('noBrochure')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <Pagination current={list.current_page} last={list.last_page} href={(num) => ({ pathname: '/admin/vehicles', query: toQuery({ status, published, q, page: num }) })} />
          </>
        ) : (
          <EmptyNote>{t('empty')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}
