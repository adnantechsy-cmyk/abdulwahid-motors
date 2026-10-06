import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CustomerPicker } from '@/components/admin/CustomerPicker';
import { LinkAppointment } from '@/components/admin/LinkAppointment';
import { Panel } from '@/components/account/Panel';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { param } from '@/lib/listing';
import type { AdminCustomerDetail } from '@/types/admin';

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Link a booking (usually a guest's) to a customer account and one of their cars, so check-in can open a job card. */
export default async function LinkAppointmentPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'appointments.manage', 'customers.manage');
  if (!/^\d{1,9}$/.test(id)) notFound();

  const raw = await searchParams;
  const q = param(raw, 'q')?.slice(0, 60);
  const number = param(raw, 'n')?.slice(0, 40);
  const name = param(raw, 'name')?.slice(0, 120);
  const customerRaw = param(raw, 'customer');
  const chosen = customerRaw && /^\d{1,9}$/.test(customerRaw) ? await adminGet<AdminCustomerDetail>(`/admin/customers/${customerRaw}`, locale) : null;
  const t = await getTranslations('admin.link');

  const keep = { ...(number ? { n: number } : {}), ...(name ? { name } : {}) };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/appointments" className="text-sm font-bold text-awm-red underline underline-offset-4">{t('backToAppointments')}</Link>
        <h1 className="mt-3 text-3xl font-extrabold">{t('appointmentTitle')}{number && <span className="ms-3 font-mono text-2xl text-awm-muted" dir="ltr">{number}</span>}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('appointmentIntro')}</p>
      </div>

      {chosen ? (
        <Panel id="link-car" title={t('chosenTitle', { name: chosen.name })}>
          <LinkAppointment appointmentId={Number(id)} customerId={chosen.id} customerName={chosen.name} cars={chosen.cars} />
        </Panel>
      ) : (
        <Panel id="link-find" title={t('searchTitle')}>
          <CustomerPicker locale={locale} path={`/admin/appointments/${id}/link`} q={q} keep={keep} newCustomer={{ name, phone: q }} />
        </Panel>
      )}
    </div>
  );
}