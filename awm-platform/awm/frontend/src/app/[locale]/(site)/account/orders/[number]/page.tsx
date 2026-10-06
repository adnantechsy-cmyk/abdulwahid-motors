import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Panel, TableScroll, td, th } from '@/components/account/Panel';
import { StatusPill } from '@/components/account/StatusPill';
import { TrackingSteps } from '@/components/account/TrackingSteps';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';
import { accountGet } from '@/lib/api/account';
import { formatDate, formatDateTime, formatMoneyAuto, formatNumber } from '@/lib/format';
import type { OrderDetail } from '@/types/account';

type Props = { params: Promise<{ locale: string; number: string }> };

/** Mirrors OrderStatus::isPayable() in Laravel (failed stays payable so a declined payment can be retried). */
const PAYABLE = new Set(['pending', 'awaiting_payment', 'failed']);

export default async function OrderPage({ params }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);

  // Order numbers are plain tokens; reject anything else before it becomes part of an API path.
  if (!/^[A-Za-z0-9-]{3,40}$/.test(number)) notFound();

  const [t, order] = await Promise.all([getTranslations('account'), accountGet<OrderDetail>(`/account/orders/${number}`, locale)]);
  if (!order) notFound();

  const tr = order.tracking;
  const pdi = tr?.pdi;
  const money = (v: string) => formatMoneyAuto(v, order.currency, locale);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/account/orders" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-awm-muted hover:text-awm-red">
          <Icon name="arrow" size={16} className="rotate-180" />{t('back')}
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-extrabold" dir="auto">{t('order.title', { number: order.number })}</h1>
          <StatusPill code={order.status} label={t(`orders.statuses.${order.status}`)} />
          {PAYABLE.has(order.status) && <ButtonLink href={`/checkout/pay/${order.number}`} size="sm">{t('order.payNow')}</ButtonLink>}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Fact label={t('orders.type')} value={t(`orders.flow.${order.flow}`)} />
          <Fact label={t('order.placedAt')} value={formatDateTime(order.placed_at, locale)} />
          {order.paid_at && <Fact label={t('order.paidAt')} value={formatDateTime(order.paid_at, locale)} />}
          {order.branch_pickup && <Fact label={t('order.pickup')} value={t.has(`branch.${order.branch_pickup}`) ? t(`branch.${order.branch_pickup}`) : order.branch_pickup} />}
          <Fact label={t('orders.total')} value={money(order.grand_total)} mono />
        </dl>
      </div>

      {tr && (
        <Panel id="tracking" title={t('tracking.title')}>
          <TrackingSteps steps={tr.steps} locale={locale} />
          {(tr.estimated_delivery_at || tr.customer_note) && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {tr.estimated_delivery_at && (
                <p className="border-s-4 border-awm-red bg-awm-panel p-4 text-sm">
                  <span className="block text-xs text-awm-muted">{t('tracking.estimated')}</span>
                  <span className="font-bold">{formatDate(tr.estimated_delivery_at, locale)}</span>
                </p>
              )}
              {tr.customer_note && (
                <p className="border-s-4 border-awm-black bg-awm-panel p-4 text-sm">
                  <span className="block text-xs text-awm-muted">{t('tracking.note')}</span>
                  <span className="font-bold">{tr.customer_note}</span>
                </p>
              )}
            </div>
          )}
        </Panel>
      )}

      {pdi && pdi.started && (
        <Panel
          id="pdi"
          title={t('tracking.pdiTitle')}
          action={<span className="text-sm font-bold text-awm-muted">{t('tracking.pdiProgress', { done: formatNumber(pdi.progress.done, locale), total: formatNumber(pdi.progress.total, locale) })}</span>}
        >
          <div className="mb-6 h-2 bg-awm-surface" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pdi.progress.percent} aria-label={t('tracking.pdiTitle')}>
            <div className="h-full bg-awm-red" style={{ width: `${pdi.progress.percent}%` }} />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {pdi.sections.map((s) => (
              <section key={s.section}>
                <h3 className="mb-3 text-sm font-extrabold">{t.has(`tracking.sections.${s.section}`) ? t(`tracking.sections.${s.section}`) : s.section}</h3>
                <ul className="flex flex-col gap-2">
                  {s.items.map((it) => (
                    <li key={it.label} className="flex items-start justify-between gap-3 border-b border-awm-line pb-2 text-sm">
                      <span>{it.label}</span>
                      <StatusPill code={it.status} label={t(`tracking.itemStatus.${it.status}`)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Panel>
      )}

      <Panel id="items" title={t('order.items')}>
        <TableScroll label={t('order.items')}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={th}>{t('order.item')}</th>
                <th scope="col" className={th}>{t('order.quantity')}</th>
                <th scope="col" className={th}>{t('order.unitPrice')}</th>
                <th scope="col" className={th}>{t('order.lineTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i, idx) => (
                <tr key={`${i.sku ?? i.name}-${idx}`}>
                  <th scope="row" className={`${td} text-start font-bold`}>
                    {i.name}
                    {i.sku && <span className="block font-mono text-xs font-normal text-awm-muted" dir="ltr">{i.sku}</span>}
                  </th>
                  <td className={`${td} font-mono tabular-nums`}>{formatNumber(i.quantity, locale)}</td>
                  <td className={`${td} font-mono tabular-nums`}>{money(i.unit_price)}</td>
                  <td className={`${td} font-mono font-bold tabular-nums`}>{money(i.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Panel>

      {order.payments.length > 0 && (
        <Panel id="payments" title={t('order.payments')}>
          <TableScroll label={t('order.payments')}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={th}>{t('order.method')}</th>
                  <th scope="col" className={th}>{t('orders.status')}</th>
                  <th scope="col" className={th}>{t('orders.total')}</th>
                  <th scope="col" className={th}>{t('orders.date')}</th>
                </tr>
              </thead>
              <tbody>
                {order.payments.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className={`${td} text-start font-bold`}>{p.method ?? '—'}</th>
                    <td className={td}><StatusPill code={p.status} label={t(`order.paymentStatuses.${p.status}`)} /></td>
                    <td className={`${td} font-mono tabular-nums`}>{money(p.amount)}</td>
                    <td className={`${td} whitespace-nowrap`}>{formatDateTime(p.created_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Panel>
      )}
    </div>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border border-awm-line bg-white p-4">
      <dt className="text-xs text-awm-muted">{label}</dt>
      <dd className={`mt-1 text-sm font-bold ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</dd>
    </div>
  );
}
