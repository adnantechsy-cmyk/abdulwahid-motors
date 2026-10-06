import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PaymentActions } from '@/components/admin/PaymentActions';
import { EmptyNote, Panel, TableScroll, td, th } from '@/components/account/Panel';
import { StatusPill } from '@/components/account/StatusPill';
import { Pagination } from '@/components/catalog/Pagination';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { formatDateTime, formatMoneyAuto } from '@/lib/format';
import { oneOf, pageParam, param, toQuery } from '@/lib/listing';
import type { LaravelPage } from '@/types/account';
import type { AdminPayment, PaymentTab } from '@/types/admin';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const TABS = ['awaiting_confirmation', 'captured', 'failed'] as const satisfies readonly PaymentTab[];

export default async function PaymentsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'payments.confirm');

  const raw = await searchParams;
  const tab = oneOf(param(raw, 'status'), TABS) ?? 'awaiting_confirmation';
  const page = pageParam(raw);

  const [t, ta, list] = await Promise.all([
    getTranslations('admin.payments'),
    getTranslations('admin'),
    adminGet<LaravelPage<AdminPayment>>(`/admin/payments?status=${tab}&page=${page}`, locale),
  ]);

  const chip = (active: boolean) => `inline-flex h-9 items-center whitespace-nowrap border px-4 text-sm font-bold ${active ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line bg-white hover:border-awm-black'}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">{t('title')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('intro')}</p>
      </div>

      <nav aria-label={t('tabsLabel')} className="flex flex-wrap gap-2">
        {TABS.map((x) => (
          <Link key={x} href={{ pathname: '/admin/payments', query: toQuery({ status: x === 'awaiting_confirmation' ? undefined : x }) }} aria-current={tab === x ? 'page' : undefined} className={chip(tab === x)}>
            {t(`tabs.${x}`)}
          </Link>
        ))}
      </nav>

      <Panel id="payments-list" title={t(`tabs.${tab}`)}>
        {list && list.data.length > 0 ? (
          <>
            <TableScroll label={t(`tabs.${tab}`)}>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={th}>{t('cols.order')}</th>
                    <th scope="col" className={th}>{t('cols.customer')}</th>
                    <th scope="col" className={th}>{t('cols.method')}</th>
                    <th scope="col" className={th}>{t('cols.amount')}</th>
                    <th scope="col" className={th}>{t('cols.when')}</th>
                    <th scope="col" className={th}>{t('cols.receipt')}</th>
                    <th scope="col" className={th}>{t('cols.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((p) => {
                    const amount = formatMoneyAuto(p.amount, p.currency, locale);
                    return (
                      <tr key={p.id} className="align-top">
                        <th scope="row" className={`${td} text-start`}>
                          <span className="block font-mono font-bold" dir="ltr">{p.order?.number ?? '—'}</span>
                          {p.order && <span className="block text-xs font-normal text-awm-muted">{t.has(`flow.${p.order.flow}`) ? t(`flow.${p.order.flow}`) : p.order.flow}</span>}
                          {p.order?.branch_pickup && <span className="block text-xs font-normal text-awm-muted">{t('pickup', { branch: ta.has(`branch.${p.order.branch_pickup}`) ? ta(`branch.${p.order.branch_pickup}`) : p.order.branch_pickup })}</span>}
                        </th>
                        <td className={td}>
                          <span className="block font-bold">{p.order?.customer.name ?? '—'}</span>
                          {p.order?.customer.phone && <span className="block font-mono text-xs text-awm-muted" dir="ltr">{p.order.customer.phone}</span>}
                        </td>
                        <td className={td}>{p.method ?? '—'}</td>
                        <td className={`${td} whitespace-nowrap font-mono font-bold tabular-nums`}>{amount}</td>
                        <td className={`${td} whitespace-nowrap`}>{formatDateTime(p.created_at, locale)}</td>
                        <td className={td}>
                          {p.has_proof ? (
                            <a href={`/api/admin/payments/${p.id}/proof`} target="_blank" rel="noopener noreferrer" className="font-bold text-awm-red underline underline-offset-4">
                              {t('receipt.view')}<span className="sr-only"> ({t('receipt.opens')})</span>
                            </a>
                          ) : (
                            <span className="text-xs text-awm-muted">{t('receipt.none')}</span>
                          )}
                        </td>
                        <td className={td}>
                          {tab === 'awaiting_confirmation' ? (
                            <PaymentActions paymentId={p.id} orderNumber={p.order?.number ?? ''} amountLabel={amount} />
                          ) : (
                            <div className="flex flex-col gap-1 text-xs">
                              <StatusPill code={p.status} label={t(`tabs.${tab}`)} />
                              {p.confirmed_at && <span className="text-awm-muted">{t('confirmedAt', { when: formatDateTime(p.confirmed_at, locale) })}</span>}
                              {p.failure_message && <span className="text-awm-muted">{t('failure', { reason: p.failure_message })}</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
            <Pagination current={list.current_page} last={list.last_page} href={(n) => ({ pathname: '/admin/payments', query: toQuery({ status: tab === 'awaiting_confirmation' ? undefined : tab, page: n }) })} />
          </>
        ) : (
          <EmptyNote>{t(`empty.${tab}`)}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}
