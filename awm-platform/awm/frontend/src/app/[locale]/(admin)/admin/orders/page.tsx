import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EmptyNote, Panel, TableScroll, td, th } from '@/components/account/Panel';
import { StatusPill } from '@/components/account/StatusPill';
import { Pagination } from '@/components/catalog/Pagination';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { formatDateTime, formatMoneyAuto } from '@/lib/format';
import { oneOf, pageParam, param, toQuery } from '@/lib/listing';
import type { LaravelPage } from '@/types/account';
import type { AdminOrder, OrderTab } from '@/types/admin';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const TABS = ['unpaid', 'paid', 'processing', 'fulfilled', 'closed'] as const satisfies readonly OrderTab[];
const FLOWS = ['vehicle_reservation', 'spare_part', 'maintenance_invoice'] as const;

export default async function OrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'orders.manage');

  const raw = await searchParams;
  const tab = oneOf(param(raw, 'tab'), TABS) ?? 'unpaid';
  const flow = oneOf(param(raw, 'flow'), FLOWS);
  const q = param(raw, 'q')?.slice(0, 60);
  const page = pageParam(raw);

  const query = new URLSearchParams({ tab, page: String(page), ...(flow ? { flow } : {}), ...(q ? { q } : {}) });
  const [t, ta, list] = await Promise.all([
    getTranslations('admin.orders'),
    getTranslations('admin'),
    adminGet<LaravelPage<AdminOrder>>(`/admin/orders?${query}`, locale),
  ]);

  const chip = (active: boolean) => `inline-flex h-9 items-center whitespace-nowrap border px-4 text-sm font-bold ${active ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line bg-white hover:border-awm-black'}`;
  const href = (next: { tab?: string; flow?: string | undefined }) => ({
    pathname: '/admin/orders' as const,
    query: toQuery({ tab: (next.tab ?? tab) === 'unpaid' ? undefined : (next.tab ?? tab), flow: 'flow' in next ? next.flow : flow, q }),
  });
  const flowLabel = (f: string) => (t.has(`flow.${f}`) ? t(`flow.${f}`) : f);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">{t('title')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('intro')}</p>
      </div>

      <nav aria-label={t('tabsLabel')} className="flex flex-wrap gap-2">
        {TABS.map((x) => (
          <Link key={x} href={href({ tab: x })} aria-current={tab === x ? 'page' : undefined} className={chip(tab === x)}>{t(`tabs.${x}`)}</Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-end gap-4">
        <form role="search" aria-label={t('searchLabel')} action={`/${locale}/admin/orders`} className="flex flex-wrap items-end gap-2">
          {tab !== 'unpaid' && <input type="hidden" name="tab" value={tab} />}
          {flow && <input type="hidden" name="flow" value={flow} />}
          <div className="flex flex-col gap-1">
            <label htmlFor="order-q" className="text-xs font-bold">{t('search')}</label>
            <input id="order-q" name="q" defaultValue={q} maxLength={60} className="h-9 w-64 max-w-full border border-awm-line bg-white px-3 text-sm" />
          </div>
          <button type="submit" className="h-9 border border-awm-black bg-awm-black px-4 text-sm font-bold text-white">{t('searchButton')}</button>
        </form>
        <nav aria-label={t('flowLabel')} className="flex flex-wrap gap-2">
          <Link href={href({ flow: undefined })} aria-current={!flow ? 'true' : undefined} className={chip(!flow)}>{t('allFlows')}</Link>
          {FLOWS.map((x) => <Link key={x} href={href({ flow: x })} aria-current={flow === x ? 'true' : undefined} className={chip(flow === x)}>{flowLabel(x)}</Link>)}
        </nav>
      </div>

      <Panel id="orders-list" title={t(`tabs.${tab}`)}>
        {list && list.data.length > 0 ? (
          <>
            <TableScroll label={t(`tabs.${tab}`)}>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={th}>{t('cols.order')}</th>
                    <th scope="col" className={th}>{t('cols.customer')}</th>
                    <th scope="col" className={th}>{t('cols.type')}</th>
                    <th scope="col" className={th}>{t('cols.total')}</th>
                    <th scope="col" className={th}>{t('cols.placed')}</th>
                    <th scope="col" className={th}>{t('cols.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((o) => (
                    <tr key={o.number} className="align-top">
                      <th scope="row" className={`${td} text-start`}>
                        <Link href={`/admin/orders/${o.number}`} className="font-mono font-bold text-awm-red underline underline-offset-4" dir="ltr">{o.number}</Link>
                        <span className="block text-xs font-normal text-awm-muted">{t('items', { count: o.items_count })}</span>
                      </th>
                      <td className={td}>
                        <span className="block font-bold">{o.customer.name ?? '—'}</span>
                        {o.customer.phone && <span className="block font-mono text-xs text-awm-muted" dir="ltr">{o.customer.phone}</span>}
                      </td>
                      <td className={td}>
                        {flowLabel(o.flow)}
                        {o.branch_pickup && <span className="block text-xs text-awm-muted">{ta.has(`branch.${o.branch_pickup}`) ? ta(`branch.${o.branch_pickup}`) : o.branch_pickup}</span>}
                      </td>
                      <td className={`${td} whitespace-nowrap font-mono font-bold tabular-nums`}>{formatMoneyAuto(o.grand_total, o.currency, locale)}</td>
                      <td className={`${td} whitespace-nowrap`}>{formatDateTime(o.placed_at, locale)}</td>
                      <td className={td}><StatusPill code={o.status} label={t.has(`statuses.${o.status}`) ? t(`statuses.${o.status}`) : o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <Pagination current={list.current_page} last={list.last_page} href={(n) => ({ pathname: '/admin/orders', query: toQuery({ tab: tab === 'unpaid' ? undefined : tab, flow, q, page: n }) })} />
          </>
        ) : (
          <EmptyNote>{t('empty')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}
