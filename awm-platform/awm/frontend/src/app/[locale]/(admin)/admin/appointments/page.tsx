import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AppointmentActions } from '@/components/admin/AppointmentActions';
import { EmptyNote, Panel, TableScroll, td, th } from '@/components/account/Panel';
import { StatusPill } from '@/components/account/StatusPill';
import { Pagination } from '@/components/catalog/Pagination';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { formatDateTime } from '@/lib/format';
import { oneOf, pageParam, param, toQuery } from '@/lib/listing';
import type { LaravelPage } from '@/types/account';
import type { AdminAppointment } from '@/types/admin';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const TABS = ['requested', 'confirmed', 'completed', 'cancelled'] as const;

export default async function AdminAppointmentsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'appointments.manage');

  const raw = await searchParams;
  const tab = oneOf(param(raw, 'status'), TABS) ?? 'requested';
  const page = pageParam(raw);

  const [t, ta, list] = await Promise.all([
    getTranslations('admin.appointments'),
    getTranslations('admin'),
    adminGet<LaravelPage<AdminAppointment>>(`/admin/appointments?status=${tab}&page=${page}`, locale),
  ]);

  const chip = (active: boolean) => `inline-flex h-9 items-center whitespace-nowrap border px-4 text-sm font-bold ${active ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line bg-white hover:border-awm-black'}`;
  const label = (group: 'types' | 'statuses', value: string) => (t.has(`${group}.${value}`) ? t(`${group}.${value}`) : value);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">{t('title')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('intro')}</p>
      </div>

      <nav aria-label={t('tabsLabel')} className="flex flex-wrap gap-2">
        {TABS.map((x) => (
          <Link key={x} href={{ pathname: '/admin/appointments', query: toQuery({ status: x === 'requested' ? undefined : x }) }} aria-current={tab === x ? 'page' : undefined} className={chip(tab === x)}>
            {t(`tabs.${x}`)}
          </Link>
        ))}
      </nav>

      <Panel id="appointments-list" title={t(`tabs.${tab}`)}>
        {list && list.data.length > 0 ? (
          <>
            <TableScroll label={t(`tabs.${tab}`)}>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={th}>{t('cols.number')}</th>
                    <th scope="col" className={th}>{t('cols.when')}</th>
                    <th scope="col" className={th}>{t('cols.branch')}</th>
                    <th scope="col" className={th}>{t('cols.service')}</th>
                    <th scope="col" className={th}>{t('cols.customer')}</th>
                    <th scope="col" className={th}>{t('cols.vehicle')}</th>
                    <th scope="col" className={th}>{t('cols.status')}</th>
                    <th scope="col" className={th}>{t('cols.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((a) => (
                    <tr key={a.id} className="align-top">
                      <th scope="row" className={`${td} whitespace-nowrap text-start font-mono font-bold`} dir="ltr">{a.number}</th>
                      <td className={`${td} whitespace-nowrap`}>{formatDateTime(a.starts_at, locale)}</td>
                      <td className={td}>{ta.has(`branch.${a.branch}`) ? ta(`branch.${a.branch}`) : a.branch}</td>
                      <td className={td}>{label('types', a.service_type)}</td>
                      <td className={td}>
                        <span className="block font-bold">{a.contact_name ?? (a.user_id ? '' : t('guest'))}</span>
                        {a.contact_phone && <span className="block font-mono text-xs text-awm-muted" dir="ltr">{a.contact_phone}</span>}
                        {!a.user_id && a.contact_name && <span className="block text-xs text-awm-muted">{t('guest')}</span>}
                        {(a.status === 'requested' || a.status === 'confirmed') && (!a.user_id || !a.customer_vehicle_id) && (
                          <Link href={{ pathname: `/admin/appointments/${a.id}/link` as '/admin/appointments', query: { n: a.number, ...(a.contact_phone ? { q: a.contact_phone } : {}), ...(a.contact_name ? { name: a.contact_name } : {}) } }} className="mt-1 inline-block text-xs font-bold text-awm-red underline underline-offset-4">
                            {t('linkCustomer')}<span className="sr-only"> {a.number}</span>
                          </Link>
                        )}
                      </td>
                      <td className={td}>{a.vehicle ?? '—'}</td>
                      <td className={td}><StatusPill code={a.status} label={label('statuses', a.status)} /></td>
                      <td className={td}><AppointmentActions appointment={a} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <Pagination current={list.current_page} last={list.last_page} href={(n) => ({ pathname: '/admin/appointments', query: toQuery({ status: tab === 'requested' ? undefined : tab, page: n }) })} />
          </>
        ) : (
          <EmptyNote>{t('empty')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}
