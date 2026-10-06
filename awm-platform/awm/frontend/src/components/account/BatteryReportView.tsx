import { getTranslations } from 'next-intl/server';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import type { BatteryReport } from '@/types/account';
import { Panel } from './Panel';
import { StatusPill } from './StatusPill';

/** The report body, shared by the signed-in account page and the public certificate verification page. */
export async function BatteryReportView({ report: r, locale }: { report: BatteryReport; locale: string }) {
  const t = await getTranslations('account');

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
      <p className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm font-bold" dir="ltr">{t('report.certificate', { number: r.certificate_number })}</span>
        <StatusPill code={r.is_valid ? 'valid' : 'invalid'} label={r.is_revoked ? t('report.revoked') : r.is_valid ? t('report.valid') : t('report.invalid')} />
        <StatusPill code={r.result.code} label={t(`report.results.${r.result.code}`)} />
      </p>

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
