import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { OrderActions } from '@/components/admin/OrderActions';
import { EmptyNote, Panel, TableScroll, td, th } from '@/components/account/Panel';
import { StatusPill } from '@/components/account/StatusPill';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { formatDateTime, formatMoneyAuto } from '@/lib/format';
import type { AdminOrderDetail } from '@/types/admin';

type Props = { params: Promise<{ locale: string; number: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'orders.manage');
  if (!/^[A-Za-z0-9-]{3,32}$/.test(number)) notFound();

  const [t, ta, order] = await Promise.all([
    getTranslations('admin.orders'),
    getTranslations('admin'),
    adminGet<AdminOrderDetail>(`/admin/orders/${number}`, locale),
  ]);
  if (!order) notFound();

  const money = (v: string) => formatMoneyAuto(v, order.currency, locale);
  const flow = t.has(`flow.${order.flow}`) ? t(`flow.${order.flow}`) : order.flow;
  const status = (s: string) => (t.has(`statuses.${s}`) ? t(`statuses.${s}`) : s);
  const address = order.shipping_address ? Object.values(order.shipping_address).filter(Boolean).join('، ') : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/orders" className="text-sm font-bold text-awm-red underline underline-offset-4">{t('backToList')}</Link>
        <h1 className="mt-3 flex flex-wrap items-center gap-3 text-3xl font-extrabold">
          <span dir="ltr" className="font-mono">{order.number}</span>
          <StatusPill code={order.status} label={status(order.status)} />
        </h1>
        <p className="mt-2 text-sm text-awm-muted">{flow} · {t('placedAt', { when: formatDateTime(order.placed_at, locale) })}</p>
      </div>

      <Panel id="order-actions" title={t('nextStep')}>
        <OrderActions order={order} amountLabel={money(order.grand_total)} />
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel id="order-customer" title={t('customer')}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="font-bold">{t('name')}</dt><dd>{order.customer.name ?? '—'}</dd>
            <dt className="font-bold">{t('phone')}</dt><dd className="font-mono" dir="ltr">{order.customer.phone ?? '—'}</dd>
            <dt className="font-bold">{t('email')}</dt><dd dir="ltr" className="break-all">{order.customer.email ?? '—'}</dd>
            {order.branch_pickup && (<><dt className="font-bold">{t('pickupBranch')}</dt><dd>{ta.has(`branch.${order.branch_pickup}`) ? ta(`branch.${order.branch_pickup}`) : order.branch_pickup}</dd></>)}
            {address && (<><dt className="font-bold">{t('address')}</dt><dd>{address}</dd></>)}
          </dl>
          {order.pdi && (
            <p className="mt-4 border-s-4 border-awm-black bg-awm-panel p-3 text-xs text-awm-muted">{t('pdiNote')}</p>
          )}
        </Panel>

        <Panel id="order-payments" title={t('payments')}>
          {order.payments.length === 0 ? (
            <EmptyNote>{t('noPayments')}</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-3">
              {order.payments.map((p) => (
                <li key={p.id} className="flex flex-col gap-1 border border-awm-line p-3 text-sm">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold">{p.method ?? '—'}{p.manual ? ` · ${t('recordedByStaff')}` : ''}</span>
                    <StatusPill code={p.status} label={t.has(`paymentStatuses.${p.status}`) ? t(`paymentStatuses.${p.status}`) : p.status} />
                  </span>
                  <span className="font-mono font-bold tabular-nums">{money(p.amount)}</span>
                  <span className="text-xs text-awm-muted">{formatDateTime(p.confirmed_at ?? p.created_at, locale)}</span>
                  {p.note && <span className="text-xs">{t('paymentNote', { note: p.note })}</span>}
                  {p.failure_message && <span className="text-xs text-awm-muted">{t('failure', { reason: p.failure_message })}</span>}
                  {p.has_proof && (
                    <a href={`/api/admin/payments/${p.id}/proof`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-awm-red underline underline-offset-4">
                      {t('viewReceipt')}<span className="sr-only"> ({t('opensNewTab')})</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel id="order-items" title={t('itemsTitle')}>
        <TableScroll label={t('itemsTitle')}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={th}>{t('cols.item')}</th>
                <th scope="col" className={th}>{t('cols.qty')}</th>
                <th scope="col" className={th}>{t('cols.unit')}</th>
                <th scope="col" className={th}>{t('cols.line')}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id}>
                  <th scope="row" className={`${td} text-start`}>
                    {i.name}
                    {i.sku && <span className="block font-mono text-xs font-normal text-awm-muted" dir="ltr">{i.sku}</span>}
                  </th>
                  <td className={`${td} font-mono tabular-nums`}>{i.quantity}</td>
                  <td className={`${td} whitespace-nowrap font-mono tabular-nums`}>{money(i.unit_price)}</td>
                  <td className={`${td} whitespace-nowrap font-mono font-bold tabular-nums`}>{money(i.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3} className={`${td} text-end`}>{t('total')}</th>
                <td className={`${td} whitespace-nowrap font-mono text-base font-extrabold tabular-nums`}>{money(order.grand_total)}</td>
              </tr>
            </tfoot>
          </table>
        </TableScroll>
      </Panel>
    </div>
  );
}
