import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Panel } from '@/components/account/Panel';
import { StatusPill } from '@/components/account/StatusPill';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';
import { accountGet } from '@/lib/api/account';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import type { BatteryReport } from '@/types/account';

type Props = { params: Promise<{ locale: string; certificate: string }> };

export default async function BatteryReportPage({ params }: Props) {
  const { locale, certificate } = await params;
  setRequestLocale(locale);
  if (!/^[A-Za-z0-9-]{3,60}$/.test(certificate)) notFound();

  const [t, r] = await Promise.all([getTranslations('account'), accountGet<BatteryReport>(`/account/battery-reports/${certificate}`, locale)]);
  if (!r) notFound();

  const num = (v: string | number | null | undefined, unit = '') => (v === null || v === undefined || v === '' ? '—' : `${formatNumber(Number(v), locale)}${unit}`);
  const range = (min: string | null, max: string | null, unit: string) => (min === null && max === null ? '—' : `${num(min)} / ${num(max)} ${unit}`);
  const car = [r.vehicle.make, r.vehicle.model, r.vehicle.model_year].filter(Boolean).join(' ');

  const readings: [string, string][] = [
    [t('report.soh'), num(r.state_of_health_pct, '%')],
    [t('report.soc'), num(r.state_of_charge_pct, '%')],
    [t('report.packVoltage'), num(r.pack_voltage_v, ' V')],
    [t('report.cellVoltage'), range(r.cell_voltage_v.min, r.cell_voltage_v.max, 'V')],
    [t('report.cellTemp'), range(r.cell_temp_c.min, r.cell_temp_c.max, '°C')],
    [t('report.insulation'), num(r.insulation_resistance_mohm, ' MΩ')],
    [t('report.cycles'), num(r.charge_cycles)],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/account/vehicles" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-awm-muted hover:text-awm-red">
          <Icon name="arrow" size={16} className="rotate-180" />{t('back')}
        </Link>
        <h1 className="text-3xl font-extrabold">{t('report.title')}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-bold" dir="ltr">{t('report.certificate', { number: r.certificate_number })}</span>
          <StatusPill code={r.is_valid ? 'valid' : 'invalid'} label={r.is_revoked ? t('report.revoked') : r.is_valid ? t('report.valid') : t('report.invalid')} />
          <StatusPill code={r.result.code} label={t(`report.results.${r.result.code}`)} />
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Fact label={t('report.vehicle')} value={car} />
        {r.vehicle.vin && <Fact label={t('report.vin')} value={r.vehicle.vin} mono />}
        {r.mileage_km != null && <Fact label={t('report.mileage')} value={t('vehicles.km', { value: formatNumber(r.mileage_km, locale) })} />}
        <Fact label={t('report.inspectedAt')} value={formatDateTime(r.inspected_at, locale)} />
        {r.valid_until && <Fact label={t('report.validUntil')} value={formatDate(r.valid_until, locale)} />}
        {r.technician && <Fact label={t('report.technician')} value={r.technician} />}
      </dl>

      <Panel id="readings" title={t('report.result')}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {readings.map(([label, value]) => (
            <div key={label} className="bg-awm-panel p-4">
              <dt className="text-xs text-awm-muted">{label}</dt>
              <dd className="mt-1 font-mono text-xl font-extrabold tabular-nums" dir="ltr">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {(r.findings || r.recommendations) && (
        <div className="grid gap-6 md:grid-cols-2">
          {r.findings && (
            <Panel id="findings" title={t('report.findings')}>
              <p className="whitespace-pre-line text-sm leading-7">{r.findings}</p>
            </Panel>
          )}
          {r.recommendations && (
            <Panel id="recommendations" title={t('report.recommendations')}>
              <p className="whitespace-pre-line text-sm leading-7">{r.recommendations}</p>
            </Panel>
          )}
        </div>
      )}

      <p className="text-xs text-awm-muted">
        {t('report.verify')}: <span className="break-all font-mono" dir="ltr">{r.verify_url}</span>
      </p>
    </div>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border border-awm-line bg-white p-4">
      <dt className="text-xs text-awm-muted">{label}</dt>
      <dd className={`mt-1 text-sm font-bold ${mono ? 'break-all font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>{value}</dd>
    </div>
  );
}
