import { getTranslations } from 'next-intl/server';
import { InvoicePanel } from '@/components/admin/InvoicePanel';
import { Icon } from '@/components/ui/Icon';
import { Badge, EmptyState, Kpi, KpiStrip, PageHeader, Pagination, TabLinks, cx } from '@/components/ui/primitives';
import { Link } from '@/i18n/navigation';
import { formatDate, formatMoney } from '@/lib/format';
import { authedGet } from '@/lib/session';
import type { InvoiceFull, InvoiceList } from '@/types/admin';

type Search = { q?: string; status?: string; page?: string; selected?: string };
const STATUSES = ['unpaid', 'partially_paid', 'overdue', 'paid', 'void'] as const;
const TONE = { unpaid: 'outlineRed', partially_paid: 'muted', paid: 'ok', void: 'dark' } as const;

/** Figma 1:21010 "Billing & collection". Syrian context: no VAT/ZATCA block, USD/SYP balances. */
export default async function InvoicesAdmin({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations('admin.billing');

  const query = new URLSearchParams(Object.entries({ q: sp.q, status: sp.status, page: sp.page }).filter(([, v]) => v) as [string, string][]);
  const [list, selected] = await Promise.all([
    authedGet<InvoiceList>(`/admin/invoices?${query}`, locale, `/${locale}/admin/invoices`),
    sp.selected ? authedGet<InvoiceFull>(`/admin/invoices/${Number(sp.selected)}`, locale) : Promise.resolve(null),
  ]);
  if (!list) return <p>{t('noAccess')}</p>;

  const href = (patch: Partial<Search>) => ({ pathname: '/admin/invoices', query: Object.fromEntries(Object.entries({ ...sp, page: undefined, ...patch }).filter(([, v]) => v)) });
  const money = (a: string, c: string) => formatMoney(a, c, locale, 2);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} />

      <KpiStrip>
        {list.outstanding.length === 0 && <Kpi label={t('kpi.outstanding')} icon="receipt" value="0" foot={t('kpi.allSettled')} />}
        {list.outstanding.map((o) => (
          <Kpi key={o.currency} label={`${t('kpi.outstanding')} (${o.currency})`} icon="receipt" tone="red"
            value={money(o.amount, o.currency).replace(o.currency, '').trim()} unit={o.currency} foot={t('kpi.invoices', { n: o.invoices })} />
        ))}
        {list.collected_today.length === 0 && <Kpi label={t('kpi.collectedToday')} icon="check" value="0" foot={t('kpi.counterAndOnline')} />}
        {list.collected_today.map((c) => (
          <Kpi key={c.currency} label={`${t('kpi.collectedToday')} (${c.currency})`} icon="check"
            value={money(c.amount, c.currency).replace(c.currency, '').trim()} unit={c.currency} foot={t('kpi.counterAndOnline')} />
        ))}
      </KpiStrip>

      <div className="flex flex-col gap-3 border-y border-awm-line py-4">
        <TabLinks tabs={[
          { href: href({ status: undefined }), label: t('tabs.all'), active: !sp.status },
          ...STATUSES.map((s) => ({ href: href({ status: s }), label: t(`status.${s}`), active: sp.status === s })),
        ]} />
        <form className="flex flex-wrap gap-2" role="search">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <div className="flex min-w-64 flex-1 items-center border border-awm-line focus-within:border-awm-black">
            <Icon name="search" className="ms-3 text-awm-muted" />
            <input name="q" defaultValue={sp.q} type="search" placeholder={t('search')} aria-label={t('search')} className="h-11 flex-1 bg-transparent px-3 text-sm focus:outline-none" />
          </div>
          <button className="h-11 bg-awm-black px-5 text-sm font-bold text-white hover:bg-awm-red">{t('searchButton')}</button>
        </form>
      </div>

      <div className={cx('grid gap-6', selected && 'xl:grid-cols-[minmax(0,1fr)_24rem]')}>
        <section className="flex min-w-0 flex-col gap-4">
          {list.data.length === 0 ? <EmptyState title={t('empty')} /> : (
            <div className="overflow-x-auto border border-awm-line">
              <table className="w-full min-w-[52rem] text-sm">
                <thead className="bg-awm-surface text-xs text-awm-muted">
                  <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-bold">
                    <th>{t('col.number')}</th><th>{t('col.customer')}</th><th>{t('col.jobCard')}</th><th>{t('col.amount')}</th><th>{t('col.status')}</th><th><span className="sr-only">{t('col.actions')}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-awm-line">
                  {list.data.map((i) => {
                    const isSel = selected?.id === i.id;
                    return (
                      <tr key={i.id} className={cx('align-top', isSel && 'bg-awm-red/5')}>
                        <td className={cx('px-4 py-4', isSel && 'border-s-4 border-s-awm-red')}>
                          <p className="font-mono text-base font-bold">{i.number}</p>
                          <p className="text-xs text-awm-muted">{formatDate(i.issued_at, locale)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-bold">{i.customer?.name ?? '-'}</p>
                          {i.customer?.phone && <p className="font-mono text-xs text-awm-muted" dir="ltr">{i.customer.phone}</p>}
                        </td>
                        <td className="px-4 py-4 font-mono text-xs">{i.job_card ?? '-'}</td>
                        <td className="px-4 py-4">
                          <p className="font-mono text-base font-bold">{money(i.total, i.currency)}</p>
                          {Number(i.balance) > 0 && i.status !== 'void' && <p className="text-xs text-awm-red">{t('balance')}: <span className="font-mono">{money(i.balance, i.currency)}</span></p>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <Badge tone={TONE[i.status]}>{t(`status.${i.status}`)}</Badge>
                            {i.is_overdue && <Badge tone="red">{t('overdueSince', { date: formatDate(i.due_at, locale) })}</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-end">
                          <Link href={href({ selected: String(i.id), page: sp.page })} aria-label={t('open', { number: i.number })} className="inline-flex size-9 items-center justify-center border border-awm-line hover:border-awm-black"><Icon name="eye" size={16} /></Link>
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
        </section>
        {selected && <InvoicePanel invoice={selected} closeHref={href({ selected: undefined, page: sp.page })} />}
      </div>
    </div>
  );
}
