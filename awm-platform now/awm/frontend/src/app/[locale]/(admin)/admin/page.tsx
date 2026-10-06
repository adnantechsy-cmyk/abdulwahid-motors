import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Kpi, KpiStrip, PageHeader, SectionTitle } from '@/components/ui/primitives';
import { formatMoney, formatNumber } from '@/lib/format';
import { authedGet } from '@/lib/session';
import type { Dashboard } from '@/types/admin';

export default async function AdminOverview({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('admin.overview');
  const d = await authedGet<Dashboard>('/admin/dashboard', locale, `/${locale}/admin`);
  if (!d) return <p>{t('noAccess')}</p>;

  const sum = (rows: { currency: string; total: string }[]) =>
    Object.entries(rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.currency]: (a[r.currency] ?? 0) + Number(r.total) }), {}));
  const monthTotals = sum(d.sales.month);
  const openCards = Object.values(d.maintenance.open_by_status).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('title')} />
      <KpiStrip>
        <Kpi label={t('salesMonth')} icon="receipt"
          value={monthTotals.length ? formatNumber(monthTotals[0][1], locale) : '0'} unit={monthTotals[0]?.[0]}
          foot={monthTotals.slice(1).map(([c, v]) => formatMoney(v, c, locale)).join(' · ') || t('paidOrdersOnly')} />
        <Kpi label={t('openJobCards')} icon="wrench" value={openCards}
          foot={t('waitingParts', { n: d.maintenance.open_by_status.waiting_parts ?? 0 })} />
        <Kpi label={t('lowStock')} icon="box" value={d.inventory.low_stock_count} tone={d.inventory.low_stock_count ? 'red' : 'default'}
          foot={<Link href="/admin/parts?low_stock=1" className="underline underline-offset-4">{t('viewLowStock')}</Link>} />
        <Kpi label={t('awaitingConfirmation')} icon="check" value={d.finance.payments_awaiting_confirmation}
          tone={d.finance.payments_awaiting_confirmation ? 'red' : 'default'} foot={t('transfersToVerify')} />
        <Kpi label={t('appointmentsToday')} icon="clock" value={d.maintenance.appointments_today}
          foot={t('requestsPending', { n: d.maintenance.appointments_requested })} />
      </KpiStrip>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <SectionTitle>{t('lowStockTitle')}</SectionTitle>
          <ul className="divide-y divide-awm-line border border-awm-line">
            {d.inventory.low_stock.length === 0 && <li className="p-4 text-sm text-awm-muted">{t('allStocked')}</li>}
            {d.inventory.low_stock.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/parts?selected=${p.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-awm-surface">
                  <span className="flex flex-col">
                    <span className="font-bold">{p.name}</span>
                    <span className="font-mono text-xs text-awm-muted">{p.sku}</span>
                  </span>
                  <span className="font-mono text-sm"><b className="text-awm-red">{p.available}</b> / {p.threshold}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4">
          <SectionTitle>{t('fleetTitle')}</SectionTitle>
          <dl className="grid grid-cols-2 gap-px border border-awm-line bg-awm-line">
            {(['available', 'reserved', 'incoming', 'sold'] as const).map((s) => (
              <div key={s} className="bg-white p-4">
                <dt className="text-sm text-awm-muted">{t(`status.${s}`)}</dt>
                <dd className="font-mono text-3xl font-bold">{d.vehicles[s] ?? 0}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-awm-muted">
            {t('outstanding')}: {d.finance.outstanding.map((o) => formatMoney(o.amount, o.currency, locale)).join(' · ') || '0'}
            {' · '}{t('overdue', { n: d.finance.overdue_invoices })}
          </p>
        </div>
      </section>
    </div>
  );
}
