import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EmptyNote, Panel, TableScroll, td, th } from '@/components/account/Panel';
import { StatusPill } from '@/components/account/StatusPill';
import { Pagination } from '@/components/catalog/Pagination';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { formatDate, formatNumber } from '@/lib/format';
import { oneOf, pageParam, param, toQuery } from '@/lib/listing';
import type { LaravelPage } from '@/types/account';
import type { AdminPdi, PdiStage } from '@/types/admin';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const STAGES = ['pending', 'in_progress', 'failed', 'handover', 'delivered'] as const satisfies readonly PdiStage[];

export default async function DeliveryListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'pdi.manage');

  const raw = await searchParams;
  const stage = oneOf(param(raw, 'stage'), STAGES) ?? 'pending';
  const q = param(raw, 'q')?.slice(0, 60);
  const page = pageParam(raw);

  const query = new URLSearchParams({ stage, page: String(page), ...(q ? { q } : {}) });
  const [t, list] = await Promise.all([getTranslations('admin.delivery'), adminGet<LaravelPage<AdminPdi>>(`/admin/pdi?${query}`, locale)]);

  const chip = (active: boolean) => `inline-flex h-9 items-center whitespace-nowrap border px-4 text-sm font-bold ${active ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line bg-white hover:border-awm-black'}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">{t('title')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('intro')}</p>
      </div>

      <nav aria-label={t('stagesLabel')} className="flex flex-wrap gap-2">
        {STAGES.map((x) => (
          <Link key={x} href={{ pathname: '/admin/delivery', query: toQuery({ stage: x === 'pending' ? undefined : x, q }) }} aria-current={stage === x ? 'page' : undefined} className={chip(stage === x)}>{t(`stages.${x}`)}</Link>
        ))}
      </nav>

      <form role="search" aria-label={t('searchLabel')} action={`/${locale}/admin/delivery`} className="flex flex-wrap items-end gap-2">
        {stage !== 'pending' && <input type="hidden" name="stage" value={stage} />}
        <div className="flex flex-col gap-1">
          <label htmlFor="pdi-q" className="text-xs font-bold">{t('search')}</label>
          <input id="pdi-q" name="q" defaultValue={q} maxLength={60} className="h-9 w-64 max-w-full border border-awm-line bg-white px-3 text-sm" />
        </div>
        <button type="submit" className="h-9 border border-awm-black bg-awm-black px-4 text-sm font-bold text-white">{t('searchButton')}</button>
      </form>

      <Panel id="pdi-list" title={t(`stages.${stage}`)}>
        {list && list.data.length > 0 ? (
          <>
            <TableScroll label={t(`stages.${stage}`)}>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={th}>{t('cols.order')}</th>
                    <th scope="col" className={th}>{t('cols.customer')}</th>
                    <th scope="col" className={th}>{t('cols.car')}</th>
                    <th scope="col" className={th}>{t('cols.progress')}</th>
                    <th scope="col" className={th}>{t('cols.eta')}</th>
                    <th scope="col" className={th}>{t('cols.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((p) => (
                    <tr key={p.id} className="align-top">
                      <th scope="row" className={`${td} text-start`}>
                        <Link href={`/admin/delivery/${p.id}`} className="font-mono font-bold text-awm-red underline underline-offset-4" dir="ltr">{p.order_number ?? `#${p.id}`}</Link>
                      </th>
                      <td className={td}>
                        <span className="block font-bold">{p.customer?.name ?? '—'}</span>
                        {p.customer?.phone && <span className="block font-mono text-xs text-awm-muted" dir="ltr">{p.customer.phone}</span>}
                        {!p.has_account && <span className="block text-xs text-awm-muted">{t('guest')}</span>}
                      </td>
                      <td className={td}>
                        {p.vehicle.name ?? '—'}
                        {p.vehicle.vin && <span className="block font-mono text-xs text-awm-muted" dir="ltr">{p.vehicle.vin}</span>}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <span className="font-mono tabular-nums">{formatNumber(p.progress.done, locale)} / {formatNumber(p.progress.total, locale)}</span>
                        {p.progress.failed > 0 && <span className="ms-2 text-xs font-bold text-awm-red">{t('failedItems', { count: p.progress.failed })}</span>}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{p.delivered_at ? formatDate(p.delivered_at, locale) : formatDate(p.estimated_delivery_at, locale)}</td>
                      <td className={td}><StatusPill code={p.delivered ? 'completed' : p.status} label={p.delivered ? t('delivered') : t(`statuses.${p.status}`)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <Pagination current={list.current_page} last={list.last_page} href={(n) => ({ pathname: '/admin/delivery', query: toQuery({ stage: stage === 'pending' ? undefined : stage, q, page: n }) })} />
          </>
        ) : (
          <EmptyNote>{t('empty')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}