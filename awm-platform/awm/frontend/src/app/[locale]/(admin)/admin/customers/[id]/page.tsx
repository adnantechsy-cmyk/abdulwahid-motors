import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CarForm } from '@/components/admin/CarForm';
import { EmptyNote, Panel, TableScroll, td, th } from '@/components/account/Panel';
import { StatusPill } from '@/components/account/StatusPill';
import { Link } from '@/i18n/navigation';
import { adminGet, can, requirePermission } from '@/lib/api/admin';
import { formatDate, formatDateTime, formatMoneyAuto, formatNumber } from '@/lib/format';
import type { AdminCustomerDetail } from '@/types/admin';

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function CustomerPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requirePermission(locale, 'customers.manage');
  if (!/^\d{1,9}$/.test(id)) notFound();

  const [t, ta, to, tp, c] = await Promise.all([getTranslations('admin.customers'), getTranslations('admin'), getTranslations('admin.orders'), getTranslations('admin.appointments'), adminGet<AdminCustomerDetail>(`/admin/customers/${id}`, locale)]);
  if (!c) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/customers" className="text-sm font-bold text-awm-red underline underline-offset-4">{t('backToList')}</Link>
        <h1 className="mt-3 text-3xl font-extrabold">{c.name}</h1>
        <p className="mt-2 text-sm text-awm-muted">
          <span className="font-mono" dir="ltr">{c.phone ?? '—'}</span>
          {c.email && <> · <span dir="ltr">{c.email}</span></>} · {t('since', { date: formatDate(c.created_at, locale) })}
        </p>
      </div>

      <Panel id="customer-cars" title={t('cars', { count: formatNumber(c.cars.length, locale) })}>
        {c.cars.length > 0 ? (
          <TableScroll label={t('cars', { count: formatNumber(c.cars.length, locale) })}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={th}>{t('carCols.car')}</th>
                  <th scope="col" className={th}>{t('carCols.plate')}</th>
                  <th scope="col" className={th}>{t('carCols.vin')}</th>
                  <th scope="col" className={th}>{t('carCols.mileage')}</th>
                  <th scope="col" className={th}>{t('carCols.warranty')}</th>
                  {can(user, 'battery.inspect') && <th scope="col" className={th}>{t('carCols.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {c.cars.map((v) => (
                  <tr key={v.id} className="align-top">
                    <th scope="row" className={`${td} text-start`}>{v.make} {v.model} {v.model_year ?? ''}{v.color && <span className="block text-xs font-normal text-awm-muted">{v.color}</span>}</th>
                    <td className={td} dir="ltr">{v.plate_number ?? '—'}</td>
                    <td className={`${td} font-mono text-xs`} dir="ltr">{v.vin ?? '—'}</td>
                    <td className={`${td} font-mono tabular-nums`}>{v.last_mileage_km != null ? `${formatNumber(v.last_mileage_km, locale)} km` : '—'}</td>
                    <td className={`${td} whitespace-nowrap`}>{v.warranty_until ? formatDate(v.warranty_until, locale) : '—'}</td>
                    {can(user, 'battery.inspect') && (
                      <td className={td}><Link href={{ pathname: '/admin/battery/new', query: { vehicle: v.id } }} className="text-xs font-bold text-awm-red underline underline-offset-4">{t('issueBattery')}</Link></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <EmptyNote>{t('noCars')}</EmptyNote>
        )}
      </Panel>

      <Panel id="customer-add-car" title={t('addCar')}>
        <CarForm customerId={c.id} />
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel id="customer-orders" title={t('recentOrders')}>
          {c.orders.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {c.orders.map((o) => (
                <li key={o.number} className="flex flex-wrap items-center justify-between gap-3 border border-awm-line p-3 text-sm">
                  <span>
                    {can(user, 'orders.manage') ? <Link href={`/admin/orders/${o.number}`} className="font-mono font-bold text-awm-red underline underline-offset-4" dir="ltr">{o.number}</Link> : <span className="font-mono font-bold" dir="ltr">{o.number}</span>}
                    <span className="block text-xs text-awm-muted">{formatDateTime(o.placed_at, locale)}</span>
                  </span>
                  <span className="font-mono font-bold tabular-nums">{formatMoneyAuto(o.grand_total, o.currency, locale)}</span>
                  <StatusPill code={o.status} label={to.has(`statuses.${o.status}`) ? to(`statuses.${o.status}`) : o.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>{t('noOrders')}</EmptyNote>
          )}
        </Panel>

        <Panel id="customer-appointments" title={t('recentAppointments')}>
          {c.appointments.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {c.appointments.map((a) => (
                <li key={a.number} className="flex flex-wrap items-center justify-between gap-3 border border-awm-line p-3 text-sm">
                  <span>
                    <span className="font-mono font-bold" dir="ltr">{a.number}</span>
                    <span className="block text-xs text-awm-muted">{formatDateTime(a.starts_at, locale)} · {ta.has(`branch.${a.branch}`) ? ta(`branch.${a.branch}`) : a.branch}</span>
                  </span>
                  <StatusPill code={a.status} label={tp.has(`statuses.${a.status}`) ? tp(`statuses.${a.status}`) : a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>{t('noAppointments')}</EmptyNote>
          )}
        </Panel>
      </div>
    </div>
  );
}