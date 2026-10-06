import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EmptyNote, Panel, TableScroll, td, th } from '@/components/account/Panel';
import { Pagination } from '@/components/catalog/Pagination';
import { ButtonLink } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { formatDate, formatNumber } from '@/lib/format';
import { pageParam, param, toQuery } from '@/lib/listing';
import type { LaravelPage } from '@/types/account';
import type { AdminCustomer } from '@/types/admin';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CustomersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'customers.manage');

  const raw = await searchParams;
  const q = param(raw, 'q')?.slice(0, 60);
  const page = pageParam(raw);

  const query = new URLSearchParams({ page: String(page), ...(q ? { q } : {}) });
  const [t, list] = await Promise.all([getTranslations('admin.customers'), adminGet<LaravelPage<AdminCustomer>>(`/admin/customers?${query}`, locale)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{t('title')}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('intro')}</p>
        </div>
        <ButtonLink href="/admin/customers/new" variant="primary" size="md">{t('add')}</ButtonLink>
      </div>

      <form role="search" aria-label={t('searchLabel')} action={`/${locale}/admin/customers`} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="cust-q" className="text-xs font-bold">{t('search')}</label>
          <input id="cust-q" name="q" defaultValue={q} maxLength={60} className="h-9 w-72 max-w-full border border-awm-line bg-white px-3 text-sm" />
        </div>
        <button type="submit" className="h-9 border border-awm-black bg-awm-black px-4 text-sm font-bold text-white">{t('searchButton')}</button>
      </form>

      <Panel id="customers-list" title={t('listTitle')}>
        {list && list.data.length > 0 ? (
          <>
            <TableScroll label={t('listTitle')}>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={th}>{t('cols.name')}</th>
                    <th scope="col" className={th}>{t('cols.phone')}</th>
                    <th scope="col" className={th}>{t('cols.email')}</th>
                    <th scope="col" className={th}>{t('cols.cars')}</th>
                    <th scope="col" className={th}>{t('cols.orders')}</th>
                    <th scope="col" className={th}>{t('cols.since')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((c) => (
                    <tr key={c.id} className="align-top">
                      <th scope="row" className={`${td} text-start`}>
                        <Link href={`/admin/customers/${c.id}`} className="font-bold text-awm-red underline underline-offset-4">{c.name}</Link>
                        {!c.is_active && <span className="block text-xs font-normal text-awm-red">{t('disabled')}</span>}
                      </th>
                      <td className={`${td} font-mono`} dir="ltr">{c.phone ?? '—'}</td>
                      <td className={`${td} break-all`} dir="ltr">{c.email ?? '—'}</td>
                      <td className={`${td} font-mono tabular-nums`}>{formatNumber(c.cars_count, locale)}</td>
                      <td className={`${td} font-mono tabular-nums`}>{formatNumber(c.orders_count, locale)}</td>
                      <td className={`${td} whitespace-nowrap`}>{formatDate(c.created_at, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <Pagination current={list.current_page} last={list.last_page} href={(n) => ({ pathname: '/admin/customers', query: toQuery({ q, page: n }) })} />
          </>
        ) : (
          <EmptyNote>{t('empty')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}