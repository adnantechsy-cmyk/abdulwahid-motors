import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { VehiclePanel } from '@/components/admin/VehiclePanel';
import { Icon } from '@/components/ui/Icon';
import { Badge, ButtonLink, EmptyState, Kpi, KpiStrip, PageHeader, Pagination, TabLinks, cx } from '@/components/ui/primitives';
import { Link } from '@/i18n/navigation';
import { formatMoney } from '@/lib/format';
import { authedGet } from '@/lib/session';
import type { AdminVehicleFull, AdminVehicleList } from '@/types/admin';

type Search = { q?: string; status?: string; powertrain?: string; page?: string; selected?: string };

const STATUS_TONE = { available: 'ok', reserved: 'red', incoming: 'muted', sold: 'dark' } as const;

/** Figma 1:21749 "Vehicles inventory" + 1:2 status/visibility side panel. */
export default async function VehiclesAdmin({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations('admin.vehicles');

  const query = new URLSearchParams(Object.entries({ q: sp.q, status: sp.status, powertrain: sp.powertrain, page: sp.page }).filter(([, v]) => v) as [string, string][]);
  const [list, selected] = await Promise.all([
    authedGet<AdminVehicleList>(`/admin/vehicles?${query}`, locale, `/${locale}/admin/vehicles`),
    sp.selected ? authedGet<AdminVehicleFull>(`/admin/vehicles/${Number(sp.selected)}`, locale) : Promise.resolve(null),
  ]);
  if (!list) return <p>{t('noAccess')}</p>;

  const href = (patch: Partial<Search>) => ({ pathname: '/admin/vehicles', query: Object.fromEntries(Object.entries({ ...sp, page: undefined, ...patch }).filter(([, v]) => v)) });
  const c = list.counts;
  const total = (c.available ?? 0) + (c.reserved ?? 0) + (c.incoming ?? 0) + (c.sold ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t('eyebrow')} title={t('title')}
        actions={<ButtonLink href="/admin/vehicles/new" icon="plus">{t('add')}</ButtonLink>} />

      <KpiStrip>
        <Kpi label={t('kpi.total')} icon="car" value={total} unit={t('kpi.vehicles')} foot={t('kpi.hidden', { n: c.hidden ?? 0 })} />
        <Kpi label={t('kpi.available')} icon="check" value={c.available ?? 0} foot={t('kpi.availableFoot')} />
        <Kpi label={t('kpi.reserved')} icon="shield" tone="red" value={c.reserved ?? 0} foot={t('kpi.reservedFoot')} />
        <Kpi label={t('kpi.incoming')} icon="truck" value={c.incoming ?? 0} foot={t('kpi.incomingFoot')} />
        <Kpi label={t('kpi.sold')} icon="receipt" value={c.sold ?? 0} foot={t('kpi.soldFoot')} />
      </KpiStrip>

      <div className="flex flex-col gap-3 border-y border-awm-line py-4">
        <form className="flex flex-wrap gap-2" role="search">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          {sp.powertrain && <input type="hidden" name="powertrain" value={sp.powertrain} />}
          <div className="flex min-w-64 flex-1 items-center border border-awm-line focus-within:border-awm-black">
            <Icon name="search" className="ms-3 text-awm-muted" />
            <input name="q" defaultValue={sp.q} type="search" placeholder={t('search')} aria-label={t('search')} className="h-11 flex-1 bg-transparent px-3 text-sm focus:outline-none" />
          </div>
          <button className="h-11 bg-awm-black px-5 text-sm font-bold text-white hover:bg-awm-red">{t('searchButton')}</button>
        </form>
        <div className="flex flex-wrap items-center gap-3">
          <TabLinks tabs={[
            { href: href({ status: undefined }), label: `${t('tabs.all')} (${total})`, active: !sp.status },
            ...(['available', 'reserved', 'incoming', 'sold'] as const).map((s) => ({ href: href({ status: s }), label: `${t(`status.${s}`)} (${c[s] ?? 0})`, active: sp.status === s })),
          ]} />
          <span className="hidden h-6 w-px bg-awm-line lg:block" />
          <TabLinks tabs={[
            { href: href({ powertrain: undefined }), label: t('tabs.anyPowertrain'), active: !sp.powertrain },
            ...(['bev', 'phev'] as const).map((p) => ({ href: href({ powertrain: p }), label: t(`powertrain.${p}`), active: sp.powertrain === p })),
          ]} />
        </div>
      </div>

      <div className={cx('grid gap-6', selected && 'xl:grid-cols-[minmax(0,1fr)_22rem]')}>
        <section className="flex min-w-0 flex-col gap-4">
          <h2 className="marker-square text-lg font-extrabold">
            {t('listTitle')} <span className="font-mono text-sm font-normal text-awm-muted">({t('showing', { shown: list.data.length, total: list.meta.total })})</span>
          </h2>

          {list.data.length === 0 ? (
            <EmptyState title={t('empty')} action={<ButtonLink href="/admin/vehicles/new" icon="plus">{t('add')}</ButtonLink>} />
          ) : (
            <div className="overflow-x-auto border border-awm-line">
              <table className="w-full min-w-[56rem] text-sm">
                <thead className="bg-awm-surface text-xs text-awm-muted">
                  <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-bold">
                    <th>{t('col.vehicle')}</th><th>{t('col.specs')}</th><th>{t('col.price')}</th><th>{t('col.status')}</th><th><span className="sr-only">{t('col.actions')}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-awm-line">
                  {list.data.map((v) => {
                    const isSel = selected?.id === v.id;
                    return (
                      <tr key={v.id} className={cx('align-top', isSel && 'bg-awm-red/5')}>
                        <td className={cx('px-4 py-4', isSel && 'border-s-4 border-s-awm-red')}>
                          <div className="flex gap-4">
                            <div className="relative h-16 w-24 shrink-0 bg-awm-surface">
                              {v.image && <Image src={v.image} alt="" fill sizes="96px" className="object-cover" />}
                              {v.powertrain === 'bev' && <span className="absolute bottom-0 end-0 bg-awm-black px-1 font-mono text-[10px] font-bold text-white">EV</span>}
                            </div>
                            <div className="flex min-w-0 flex-col gap-1">
                              <p className="font-extrabold">{v.name} <Badge tone="dark" className="font-mono">{v.model_year}</Badge></p>
                              {v.vin && <p className="font-mono text-xs">VIN: {v.vin}</p>}
                              <p className="text-xs text-awm-muted">{[v.exterior_color, v.branch && t(`branches.${v.branch}`), v.category].filter(Boolean).join(' | ')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs leading-6">
                          <p className="font-bold">{t(`powertrain.${v.powertrain}`)}</p>
                          {v.specs?.battery_kwh && <p className="font-mono">{v.specs.battery_kwh} kWh</p>}
                          {v.specs?.range_km && <p className="font-mono">{t('range', { km: v.specs.range_km })}</p>}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-mono text-lg font-bold">{formatMoney(v.price, v.currency, locale)}</p>
                          <p className="text-xs text-awm-muted">{t('deposit')}: <span className="font-mono">{formatMoney(v.deposit_amount, v.currency, locale)}</span></p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <Badge tone={STATUS_TONE[v.status.code]}>{v.status.label}</Badge>
                            {!v.is_published && <Badge tone="outlineRed">{t('hidden')}</Badge>}
                            {v.reserved_order_id && <span className="text-xs text-awm-muted">{t('onlineReservation')}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-1">
                            <Link href={href({ selected: String(v.id), page: sp.page })} aria-label={t('open', { name: v.name })} className="flex size-9 items-center justify-center border border-awm-line hover:border-awm-black"><Icon name="eye" size={16} /></Link>
                            <Link href={`/admin/vehicles/${v.id}`} aria-label={t('edit', { name: v.name })} className="flex size-9 items-center justify-center border border-awm-line hover:border-awm-black"><Icon name="pencil" size={16} /></Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination current={list.meta.current_page} last={list.meta.last_page} labels={{ prev: t('prev'), next: t('next') }}
            hrefFor={(p) => href({ page: String(p), selected: sp.selected })} />
        </section>

        {selected && <VehiclePanel vehicle={selected} closeHref={href({ selected: undefined, page: sp.page })} />}
      </div>
    </div>
  );
}
