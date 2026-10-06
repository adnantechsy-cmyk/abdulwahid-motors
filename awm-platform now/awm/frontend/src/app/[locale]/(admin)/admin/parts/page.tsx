import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { PartStockPanel } from '@/components/admin/PartStockPanel';
import { Icon } from '@/components/ui/Icon';
import { Badge, ButtonLink, EmptyState, Kpi, KpiStrip, PageHeader, Pagination, TabLinks, cx } from '@/components/ui/primitives';
import { Link } from '@/i18n/navigation';
import { apiGet } from '@/lib/api/server';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { authedGet, can, getMe } from '@/lib/session';
import type { AdminPartFull, AdminPartList } from '@/types/admin';
import type { CategoryDto } from '@/types/api';

type Search = { q?: string; category_id?: string; low_stock?: string; page?: string; selected?: string };

/** Figma 1:20349 "Spare parts & inventory". */
export default async function PartsAdmin({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations('admin.parts');
  const me = await getMe();

  const query = new URLSearchParams(Object.entries({ q: sp.q, category_id: sp.category_id, low_stock: sp.low_stock, page: sp.page }).filter(([, v]) => v) as [string, string][]);
  const [list, categories, selected] = await Promise.all([
    authedGet<AdminPartList>(`/admin/parts?${query}`, locale, `/${locale}/admin/parts`),
    apiGet<CategoryDto[]>('/categories?type=spare_part', { locale, tags: ['categories'] }).catch(() => []),
    sp.selected ? authedGet<AdminPartFull>(`/admin/parts/${Number(sp.selected)}`, locale) : Promise.resolve(null),
  ]);
  if (!list) return <p>{t('noAccess')}</p>;

  const href = (patch: Partial<Search>) => ({ pathname: '/admin/parts', query: Object.fromEntries(Object.entries({ ...sp, page: undefined, ...patch }).filter(([, v]) => v)) });
  const c = list.counts;
  const canManage = can(me, 'parts.manage');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} badge={<Badge tone="dark">GENUINE BYD</Badge>}
        actions={canManage ? <ButtonLink href="/admin/parts/new" icon="plus">{t('add')}</ButtonLink> : undefined} />

      <KpiStrip>
        <Kpi label={t('kpi.skus')} icon="box" value={formatNumber(c.total, locale)}
          foot={c.stock_value.map((s) => `${t('kpi.stockValue')}: ${formatMoney(s.value, s.currency, locale)}`).join(' · ') || t('kpi.noCost')} />
        <Kpi label={t('kpi.lowStock')} icon="alert" tone={c.low_stock ? 'red' : 'default'} value={c.low_stock}
          foot={<Link href={href({ low_stock: '1' })} className="underline underline-offset-4">{t('kpi.showLow')}</Link>} />
        <Kpi label={t('kpi.outOfStock')} icon="close" value={c.out_of_stock} foot={t('kpi.outFoot')} />
        <Kpi label={t('kpi.hidden')} icon="eyeOff" value={c.hidden} foot={t('kpi.hiddenFoot')} />
      </KpiStrip>

      <div className="flex flex-col gap-3 border-y border-awm-line py-4">
        <form className="flex flex-wrap gap-2" role="search">
          {sp.category_id && <input type="hidden" name="category_id" value={sp.category_id} />}
          <div className="flex min-w-64 flex-1 items-center border border-awm-line focus-within:border-awm-black">
            <Icon name="search" className="ms-3 text-awm-muted" />
            <input name="q" defaultValue={sp.q} type="search" placeholder={t('search')} aria-label={t('search')} className="h-11 flex-1 bg-transparent px-3 text-sm focus:outline-none" />
          </div>
          <label className="flex h-11 items-center gap-2 border border-awm-line px-3 text-sm">
            <input type="checkbox" name="low_stock" value="1" defaultChecked={!!sp.low_stock} className="size-4 accent-awm-red" />{t('onlyLow')}
          </label>
          <button className="h-11 bg-awm-black px-5 text-sm font-bold text-white hover:bg-awm-red">{t('searchButton')}</button>
        </form>
        <TabLinks tabs={[
          { href: href({ category_id: undefined }), label: `${t('allCategories')} (${formatNumber(c.total, locale)})`, active: !sp.category_id },
          ...(categories ?? []).map((cat) => ({ href: href({ category_id: String(cat.id) }), label: cat.name, active: sp.category_id === String(cat.id) })),
        ]} />
      </div>

      {list.data.length === 0 ? (
        <EmptyState title={t('empty')} action={canManage ? <ButtonLink href="/admin/parts/new" icon="plus">{t('add')}</ButtonLink> : undefined} />
      ) : (
        <div className="overflow-x-auto border border-awm-line">
          <table className="w-full min-w-[60rem] text-sm">
            <thead className="bg-awm-surface text-xs text-awm-muted">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-bold">
                <th>{t('col.code')}</th><th>{t('col.item')}</th><th>{t('col.models')}</th><th>{t('col.bin')}</th><th>{t('col.stock')}</th><th>{t('col.price')}</th><th><span className="sr-only">{t('col.actions')}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-awm-line">
              {list.data.map((p) => {
                const isSel = selected?.id === p.id;
                return (
                  <tr key={p.id} className={cx('align-top', isSel && 'bg-awm-red/5')}>
                    <td className={cx('px-4 py-4', isSel && 'border-s-4 border-s-awm-red')}>
                      <p className="font-mono font-bold">{p.sku}</p>
                      {p.oem_number && <p className="font-mono text-xs text-awm-muted">OEM: {p.oem_number}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-3">
                        <div className="relative size-12 shrink-0 bg-awm-surface">{p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />}</div>
                        <div className="flex flex-col gap-1">
                          <p className="font-bold">{p.name}</p>
                          <p className="text-xs text-awm-muted">{p.category ?? t('uncategorised')}{!p.is_published && <> · <span className="text-awm-red">{t('hidden')}</span></>}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex max-w-48 flex-wrap gap-1">
                        {p.compatible_models.length ? p.compatible_models.map((m) => <Badge key={m} className="font-mono uppercase">{m}</Badge>) : <span className="text-xs text-awm-muted">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">{p.bin_location ? <span className="inline-block bg-awm-surface px-2 py-1 font-mono text-sm font-bold">{p.bin_location}</span> : '-'}</td>
                    <td className="px-4 py-4">
                      <p className={cx('flex items-center gap-2 font-mono text-base font-bold', p.is_low_stock && 'text-awm-red')}>
                        <span className={cx('size-2', p.is_low_stock ? 'bg-awm-red' : 'bg-awm-black')} aria-hidden="true" />
                        {p.available} <span className="font-sans text-xs font-normal">{t('units')}</span>
                      </p>
                      <p className="text-xs text-awm-muted">{t('reservedN', { n: p.reserved_quantity })} · {t('minN', { n: p.low_stock_threshold })}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-mono font-bold">{formatMoney(p.price, p.currency, locale, 2)}</p>
                      {p.cost_price && <p className="text-xs text-awm-muted">{t('cost')}: <span className="font-mono">{formatMoney(p.cost_price, p.currency, locale, 2)}</span></p>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <Link href={href({ selected: String(p.id), page: sp.page })} aria-label={t('open', { name: p.name })} className="flex size-9 items-center justify-center border border-awm-line hover:border-awm-black"><Icon name="eye" size={16} /></Link>
                        {canManage && <Link href={`/admin/parts/${p.id}`} aria-label={t('edit', { name: p.name })} className="flex size-9 items-center justify-center border border-awm-line hover:border-awm-black"><Icon name="pencil" size={16} /></Link>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-awm-muted">{t('showing', { shown: list.data.length, total: list.meta.total })}</p>
        <Pagination current={list.meta.current_page} last={list.meta.last_page} labels={{ prev: t('prev'), next: t('next') }} hrefFor={(p) => href({ page: String(p) })} />
      </div>

      {selected && (
        <section className="grid gap-6 border-t-4 border-awm-black pt-6 lg:grid-cols-[minmax(0,1fr)_24rem]" aria-labelledby="part-detail">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="marker-square text-xs font-bold text-awm-muted">{t('detailTitle')}</p>
                <h2 id="part-detail" className="text-2xl font-extrabold">{selected.name[locale] || selected.name.en}</h2>
                {selected.description[locale] && <p className="mt-2 max-w-2xl text-sm leading-7 text-awm-muted">{selected.description[locale]}</p>}
              </div>
              <Badge tone="dark" className="font-mono">#{selected.sku}</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-px border border-awm-line bg-awm-line text-sm md:grid-cols-4">
              {[
                [t('col.bin'), selected.bin_location ?? '-'],
                [t('onHand'), String(selected.stock_quantity)],
                [t('reserved'), String(selected.reserved_quantity)],
                [t('reorderAt'), String(selected.low_stock_threshold)],
              ].map(([k, val]) => (
                <div key={k} className="bg-white p-3"><dt className="text-xs text-awm-muted">{k}</dt><dd className="font-mono text-lg font-bold">{val}</dd></div>
              ))}
            </dl>
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-extrabold">{t('auditTrail')}</h3>
              <ul className="divide-y divide-awm-line border border-awm-line text-sm">
                {(selected.movements ?? []).length === 0 && <li className="p-3 text-awm-muted">{t('noMovements')}</li>}
                {(selected.movements ?? []).map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <span className="flex items-center gap-2">
                      <span className={cx('font-mono font-bold', m.quantity_change < 0 ? 'text-awm-red' : 'text-awm-ok')}>{m.quantity_change > 0 ? '+' : ''}{m.quantity_change}</span>
                      <span>{t(`movement.${m.type}`)}</span>
                      {m.reference?.number && <span className="font-mono text-xs text-awm-muted">{m.reference.number}</span>}
                      {m.note && <span className="text-xs text-awm-muted">· {m.note}</span>}
                    </span>
                    <span className="text-xs text-awm-muted">{m.user ?? t('system')} · {formatDate(m.at, locale, true)} · {t('balance')}: <b className="font-mono">{m.balance_after}</b></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {can(me, 'stock.adjust') && <PartStockPanel partId={selected.id} />}
        </section>
      )}
    </div>
  );
}
