import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EmptyNote, Panel, TableScroll, td, th } from '@/components/account/Panel';
import { PayInvoiceButton } from '@/components/account/PayInvoiceButton';
import { StatusPill } from '@/components/account/StatusPill';
import { Pagination } from '@/components/catalog/Pagination';
import { accountGet } from '@/lib/api/account';
import { formatDate, formatMoneyAuto } from '@/lib/format';
import { pageParam, toQuery } from '@/lib/listing';
import type { InvoiceRow, LaravelPage } from '@/types/account';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function InvoicesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = pageParam(await searchParams);

  const [t, list] = await Promise.all([getTranslations('account'), accountGet<LaravelPage<InvoiceRow>>(`/account/invoices?page=${page}`, locale)]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">{t('invoices.title')}</h1>
      <Panel id="invoices" title={t('invoices.title')}>
        {list && list.data.length > 0 ? (
          <>
            <TableScroll label={t('invoices.title')}>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={th}>{t('invoices.number')}</th>
                    <th scope="col" className={th}>{t('invoices.jobCard')}</th>
                    <th scope="col" className={th}>{t('invoices.status')}</th>
                    <th scope="col" className={th}>{t('invoices.total')}</th>
                    <th scope="col" className={th}>{t('invoices.paid')}</th>
                    <th scope="col" className={th}>{t('invoices.balance')}</th>
                    <th scope="col" className={th}>{t('invoices.issued')}</th>
                    <th scope="col" className={th}>{t('invoices.due')}</th>
                    <th scope="col" className={th}><span className="sr-only">{t('invoices.pay')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((i) => (
                    <tr key={i.id}>
                      <th scope="row" className={`${td} text-start font-mono font-bold`} dir="ltr">{i.number}</th>
                      <td className={`${td} font-mono`} dir="ltr">{i.job_card ?? '—'}</td>
                      <td className={td}><StatusPill code={i.status} label={t(`invoices.statuses.${i.status}`)} /></td>
                      <td className={`${td} font-mono tabular-nums`}>{formatMoneyAuto(i.total, i.currency, locale)}</td>
                      <td className={`${td} font-mono tabular-nums`}>{formatMoneyAuto(i.paid_amount, i.currency, locale)}</td>
                      <td className={`${td} font-mono font-bold tabular-nums`}>{formatMoneyAuto(i.balance, i.currency, locale)}</td>
                      <td className={`${td} whitespace-nowrap`}>{formatDate(i.issued_at, locale)}</td>
                      <td className={`${td} whitespace-nowrap`}>{formatDate(i.due_at, locale) || '—'}</td>
                      <td className={td}>{i.payable && <PayInvoiceButton invoice={i} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <Pagination current={list.current_page} last={list.last_page} href={(p) => ({ pathname: '/account/invoices', query: toQuery({ page: p }) })} />
          </>
        ) : (
          <EmptyNote>{t('empty.invoices')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}
