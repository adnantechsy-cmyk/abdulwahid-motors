import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CustomerPicker } from '@/components/admin/CustomerPicker';
import { LinkOrder } from '@/components/admin/LinkOrder';
import { Panel } from '@/components/account/Panel';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { param } from '@/lib/listing';
import type { AdminCustomerDetail, AdminOrderDetail } from '@/types/admin';

type Props = { params: Promise<{ locale: string; number: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Attach a guest order to a customer's account (so the car handed over lands in their cars). */
export default async function LinkOrderPage({ params, searchParams }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'orders.manage');
  if (!/^[A-Za-z0-9-]{3,32}$/.test(number)) notFound();

  const raw = await searchParams;
  const order = await adminGet<AdminOrderDetail>(`/admin/orders/${number}`, locale);
  if (!order) notFound();

  const q = (param(raw, 'q') ?? order.customer.phone ?? undefined)?.slice(0, 60);
  const customerRaw = param(raw, 'customer');
  const chosen = customerRaw && /^\d{1,9}$/.test(customerRaw) ? await adminGet<AdminCustomerDetail>(`/admin/customers/${customerRaw}`, locale) : null;
  const t = await getTranslations('admin.link');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/orders/${number}`} className="text-sm font-bold text-awm-red underline underline-offset-4">{t('backToOrder')}</Link>
        <h1 className="mt-3 text-3xl font-extrabold">{t('orderTitle')} <span className="font-mono text-2xl text-awm-muted" dir="ltr">{number}</span></h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('orderIntro', { name: order.customer.name ?? '—', phone: order.customer.phone ?? '—' })}</p>
      </div>

      {order.has_account ? (
        <p role="status" className="border-s-4 border-awm-black bg-awm-panel p-4 font-bold">{t('alreadyLinked')}</p>
      ) : chosen ? (
        <Panel id="link-order" title={t('chosenTitle', { name: chosen.name })}>
          <LinkOrder number={number} customerId={chosen.id} customerName={chosen.name} />
        </Panel>
      ) : (
        <Panel id="link-find" title={t('searchTitle')}>
          <CustomerPicker locale={locale} path={`/admin/orders/${number}/link`} q={q} newCustomer={{ name: order.customer.name, phone: order.customer.phone }} />
        </Panel>
      )}
    </div>
  );
}