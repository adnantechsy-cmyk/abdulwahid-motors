import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EmptyNote, Panel } from '@/components/account/Panel';
import { OrdersTable } from '@/components/account/OrdersTable';
import { OwnedVehicleCard } from '@/components/account/VehicleCard';
import { ButtonLink } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { accountGet, accountUser } from '@/lib/api/account';
import { formatNumber } from '@/lib/format';
import type { AccountSummary, LaravelPage, OrderRow, OwnedVehicleListItem } from '@/types/account';

type Props = { params: Promise<{ locale: string }> };

export default async function AccountHome({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, user, summary, orders, vehicles] = await Promise.all([
    getTranslations('account'),
    accountUser(locale),
    accountGet<AccountSummary>('/account/summary', locale),
    accountGet<LaravelPage<OrderRow>>('/account/orders', locale),
    accountGet<OwnedVehicleListItem[]>('/account/vehicles', locale),
  ]);

  const stats: { key: keyof AccountSummary; label: string; href: string }[] = [
    { key: 'vehicles', label: t('summary.vehicles'), href: '/account/vehicles' },
    { key: 'active_orders', label: t('summary.activeOrders'), href: '/account/orders' },
    { key: 'open_job_cards', label: t('summary.openJobCards'), href: '/account/vehicles' },
    { key: 'unpaid_invoices', label: t('summary.unpaidInvoices'), href: '/account/invoices' },
    { key: 'upcoming_appointments', label: t('summary.appointments'), href: '/account/appointments' },
  ];

  const recent = orders?.data.slice(0, 5) ?? [];
  const cars = vehicles ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{t('welcome', { name: user?.name ?? '' })}</h1>
          {user && <p className="mt-2 font-mono text-sm text-awm-muted" dir="ltr">{user.phone ?? user.email}</p>}
        </div>
        <ButtonLink href="/service-booking">{t('bookAppointment')}</ButtonLink>
      </div>

      {summary && (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {stats.map((s) => (
            <li key={s.key} className="border border-awm-line bg-white">
              <Link href={s.href} className="flex h-full flex-col gap-2 p-5 hover:bg-awm-bg">
                <span className="text-xs font-bold text-awm-muted">{s.label}</span>
                <span className="font-mono text-4xl font-extrabold tabular-nums">{formatNumber(summary[s.key], locale)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Panel
        id="recent-orders"
        title={t('orders.recent')}
        action={<Link href="/account/orders" className="text-sm font-bold text-awm-red underline underline-offset-4">{t('viewAll')}</Link>}
      >
        {recent.length > 0 ? <OrdersTable orders={recent} locale={locale} /> : <EmptyNote>{t('empty.orders')}</EmptyNote>}
      </Panel>

      <Panel
        id="my-cars"
        title={t('vehicles.title')}
        action={cars.length > 0 ? <Link href="/account/vehicles" className="text-sm font-bold text-awm-red underline underline-offset-4">{t('viewAll')}</Link> : undefined}
      >
        {cars.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cars.slice(0, 3).map((v) => <OwnedVehicleCard key={v.id} vehicle={v} locale={locale} />)}
          </div>
        ) : (
          <EmptyNote>{t('empty.vehicles')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}
