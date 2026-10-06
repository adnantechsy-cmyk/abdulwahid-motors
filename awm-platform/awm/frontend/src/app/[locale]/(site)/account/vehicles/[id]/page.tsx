import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EmptyNote, Panel } from '@/components/account/Panel';
import { PayInvoiceButton } from '@/components/account/PayInvoiceButton';
import { StatusPill } from '@/components/account/StatusPill';
import { AppointmentList } from '@/components/account/AppointmentList';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';
import { accountGet } from '@/lib/api/account';
import { formatDate, formatMoneyAuto, formatNumber } from '@/lib/format';
import type { OwnedVehicleDetail } from '@/types/account';

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function VehicleDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^\d{1,9}$/.test(id)) notFound();

  const [t, v] = await Promise.all([getTranslations('account'), accountGet<OwnedVehicleDetail>(`/account/vehicles/${id}`, locale)]);
  if (!v) notFound();

  const title = [v.make, v.model, v.model_year].filter(Boolean).join(' ');
  const facts = [
    v.plate_number && [t('vehicles.plate'), v.plate_number, false],
    v.vin && [t('vehicles.vin'), v.vin, true],
    v.color && [t('vehicles.color'), v.color, false],
    v.last_mileage_km != null && [t('vehicles.mileage'), t('vehicles.km', { value: formatNumber(v.last_mileage_km, locale) }), false],
    v.purchased_at && [t('vehicles.purchased'), formatDate(v.purchased_at, locale), false],
    v.warranty_until && [t('vehicles.warranty'), formatDate(v.warranty_until, locale), false],
  ].filter(Boolean) as [string, string, boolean][];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/account/vehicles" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-awm-muted hover:text-awm-red">
          <Icon name="arrow" size={16} className="rotate-180" />{t('back')}
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <StatusPill code={v.under_warranty ? 'valid' : 'void'} label={v.under_warranty ? t('vehicles.underWarranty') : t('vehicles.warrantyEnded')} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {facts.map(([label, value, mono]) => (
            <div key={label} className="border border-awm-line bg-white p-4">
              <dt className="text-xs text-awm-muted">{label}</dt>
              <dd className={`mt-1 text-sm font-bold ${mono ? 'break-all font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Panel id="history" title={t('vehicles.history')}>
        {v.service_history.length === 0 ? (
          <EmptyNote>{t('empty.history')}</EmptyNote>
        ) : (
          <ol className="flex flex-col gap-4">
            {v.service_history.map((job) => (
              <li key={job.number} className="border border-awm-line">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-awm-line bg-awm-panel px-4 py-3">
                  <p className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-bold" dir="ltr">{job.number}</span>
                    <StatusPill code={job.status.code} label={t.has(`vehicles.jobStatus.${job.status.code}`) ? t(`vehicles.jobStatus.${job.status.code}`) : job.status.label} />
                  </p>
                  <p className="text-xs text-awm-muted">
                    {t('vehicles.opened')} {formatDate(job.opened_at, locale)}
                    {job.completed_at && <> · {t('vehicles.completed')} {formatDate(job.completed_at, locale)}</>}
                  </p>
                </div>
                <dl className="grid gap-4 p-4 text-sm md:grid-cols-2">
                  {job.complaint && <Detail label={t('vehicles.complaint')} value={job.complaint} />}
                  {job.work_done && <Detail label={t('vehicles.workDone')} value={job.work_done} />}
                  {job.branch && <Detail label={t('vehicles.branch')} value={t.has(`branch.${job.branch}`) ? t(`branch.${job.branch}`) : job.branch} />}
                  {job.mileage_in_km != null && <Detail label={t('vehicles.mileageIn')} value={t('vehicles.km', { value: formatNumber(job.mileage_in_km, locale) })} />}
                </dl>
                {job.invoice && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-awm-line px-4 py-3">
                    <p className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-bold">{t('vehicles.invoice', { number: job.invoice.number })}</span>
                      <StatusPill code={job.invoice.status} label={t(`invoices.statuses.${job.invoice.status}`)} />
                      <span className="font-mono tabular-nums">{formatMoneyAuto(job.invoice.total, job.invoice.currency, locale)}</span>
                    </p>
                    {(job.invoice.status === 'unpaid' || job.invoice.status === 'partially_paid') && Number(job.invoice.balance) > 0 && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-awm-muted">{t('vehicles.balance')}: <span className="font-mono font-bold tabular-nums">{formatMoneyAuto(job.invoice.balance, job.invoice.currency, locale)}</span></span>
                        <PayInvoiceButton invoice={job.invoice} />
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel id="battery" title={t('vehicles.reports')}>
        {v.battery_reports.length === 0 ? (
          <EmptyNote>{t('empty.battery')}</EmptyNote>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {v.battery_reports.map((r) => (
              <li key={r.certificate_number} className="flex flex-col gap-3 border border-awm-line p-4">
                <p className="font-mono text-sm font-bold" dir="ltr">{t('vehicles.certificate', { number: r.certificate_number })}</p>
                <p className="flex flex-wrap items-center gap-2">
                  <StatusPill code={r.result.code} label={t(`report.results.${r.result.code}`)} />
                  <StatusPill code={r.is_valid ? 'valid' : 'invalid'} label={r.is_valid ? t('vehicles.valid') : t('vehicles.invalid')} />
                </p>
                <p className="text-sm"><span className="text-awm-muted">{t('report.soh')}: </span><span className="font-mono font-bold tabular-nums">{formatNumber(Number(r.state_of_health_pct), locale)}%</span></p>
                <p className="text-xs text-awm-muted">{formatDate(r.inspected_at, locale)}</p>
                <Link href={`/account/battery-reports/${r.certificate_number}`} className="mt-auto text-sm font-bold text-awm-red underline underline-offset-4">{t('vehicles.viewReport')}</Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel id="appointments" title={t('vehicles.appointments')}>
        {v.appointments.length === 0 ? <EmptyNote>{t('empty.appointments')}</EmptyNote> : <AppointmentList appointments={v.appointments} locale={locale} />}
      </Panel>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-awm-muted">{label}</dt>
      <dd className="mt-1 font-bold">{value}</dd>
    </div>
  );
}
