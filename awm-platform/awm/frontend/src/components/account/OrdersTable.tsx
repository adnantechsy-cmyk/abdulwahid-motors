import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { formatDate, formatMoneyAuto } from '@/lib/format';
import type { OrderRow } from '@/types/account';
import { StatusPill } from './StatusPill';
import { TableScroll, td, th } from './Panel';

export async function OrdersTable({ orders, locale }: { orders: OrderRow[]; locale: string }) {
  const t = await getTranslations('account.orders');

  return (
    <TableScroll label={t('title')}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className={th}>{t('number')}</th>
            <th scope="col" className={th}>{t('type')}</th>
            <th scope="col" className={th}>{t('status')}</th>
            <th scope="col" className={th}>{t('total')}</th>
            <th scope="col" className={th}>{t('date')}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.number} className="hover:bg-awm-bg">
              <th scope="row" className={`${td} whitespace-nowrap text-start font-mono font-bold`} dir="ltr">
                <Link href={`/account/orders/${o.number}`} aria-label={t('open', { number: o.number })} className="text-awm-red underline underline-offset-4">{o.number}</Link>
              </th>
              <td className={td}>{t(`flow.${o.flow}`)}</td>
              <td className={td}><StatusPill code={o.status} label={t(`statuses.${o.status}`)} /></td>
              <td className={`${td} font-mono tabular-nums`}>{formatMoneyAuto(o.grand_total, o.currency, locale)}</td>
              <td className={`${td} whitespace-nowrap`}>{formatDate(o.placed_at, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
