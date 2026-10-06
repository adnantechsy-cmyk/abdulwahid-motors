'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { formatDateTime, formatMoneyAuto, formatNumber } from '@/lib/format';
import type { AdminJobCard, JobCardAction, Technician } from '@/types/admin';
import { useAdminRun } from './useAdminRun';

type Props = { card: AdminJobCard; technicians: Technician[] | null };

const small = 'h-9 whitespace-nowrap px-3 text-xs';

/** One card on the workshop board: details, the actions its status allows, and (for managers) the technician. */
export function JobCardCard({ card, technicians }: Props) {
  const t = useTranslations('admin.jobCards');
  const ta = useTranslations('admin');
  const locale = useLocale();
  const { run, pending, error, setError } = useAdminRun();
  const [completing, setCompleting] = useState(false);
  const [labor, setLabor] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'SYP'>('USD');
  const [laborError, setLaborError] = useState(false);
  const id = useId();

  const service = card.service_type ? (t.has(`serviceTypes.${card.service_type}`) ? t(`serviceTypes.${card.service_type}`) : card.service_type) : null;
  const branch = card.branch ? (ta.has(`branch.${card.branch}`) ? ta(`branch.${card.branch}`) : card.branch) : null;

  const status = (next: 'in_progress' | 'waiting_parts') => run('PUT', `job-cards/${card.id}/status`, { status: next });

  const act = (action: JobCardAction) => {
    if (action === 'start' || action === 'resume') return status('in_progress');
    if (action === 'wait_parts') return status('waiting_parts');
    setCompleting(true);
  };

  async function complete() {
    const n = Number(labor);
    if (labor.trim() === '' || !Number.isFinite(n) || n < 0) return setLaborError(true);
    setLaborError(false);
    const result = await run('POST', `job-cards/${card.id}/complete`, { labor_total: n, currency });
    if (result.ok) setCompleting(false);
  }

  return (
    <article className="flex flex-col gap-3 border border-awm-line bg-white p-4" aria-label={card.number}>
      <header className="flex items-start justify-between gap-2">
        <h3 className="font-mono text-sm font-extrabold" dir="ltr">{card.number}</h3>
        {branch && <span className="text-xs text-awm-muted">{branch}</span>}
      </header>

      <dl className="flex flex-col gap-2 text-sm">
        {card.customer && (
          <div>
            <dt className="text-xs text-awm-muted">{t('customer')}</dt>
            <dd className="font-bold">{card.customer.name}{card.customer.phone && <span className="ms-2 font-mono text-xs font-normal text-awm-muted" dir="ltr">{card.customer.phone}</span>}</dd>
          </div>
        )}
        {card.vehicle && (
          <div>
            <dt className="text-xs text-awm-muted">{t('vehicle')}</dt>
            <dd className="font-bold">{card.vehicle.label}{card.vehicle.plate_number && <span className="ms-2 font-mono text-xs font-normal text-awm-muted">{card.vehicle.plate_number}</span>}</dd>
          </div>
        )}
        {service && (
          <div>
            <dt className="text-xs text-awm-muted">{t('service')}</dt>
            <dd>{service}</dd>
          </div>
        )}
        {card.complaint && (
          <div>
            <dt className="text-xs text-awm-muted">{t('complaint')}</dt>
            <dd className="line-clamp-3 text-awm-muted">{card.complaint}</dd>
          </div>
        )}
      </dl>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-awm-muted">
        {card.scheduled_at && <span>{t('scheduled')}: {formatDateTime(card.scheduled_at, locale)}</span>}
        {card.mileage_in_km != null && <span>{t('mileage', { value: formatNumber(card.mileage_in_km, locale) })}</span>}
      </p>

      {technicians && card.status.code !== 'completed' ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-tech`} className="text-xs font-bold">{t('assign.label')}</label>
          <select
            id={`${id}-tech`}
            value={card.technician?.id ?? ''}
            disabled={pending}
            onChange={(e) => run('PUT', `job-cards/${card.id}/technician`, { technician_id: e.target.value ? Number(e.target.value) : null })}
            className="h-9 w-full border border-awm-line bg-white px-2 text-sm"
          >
            <option value="">{t('assign.none')}</option>
            {technicians.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
      ) : (
        <p className="text-xs"><span className="text-awm-muted">{t('technician')}: </span><span className="font-bold">{card.technician?.name ?? t('unassigned')}</span></p>
      )}

      {card.invoice && (
        <p className="border-s-4 border-awm-black bg-awm-panel p-2 text-xs">
          <span className="font-bold">{t('invoice', { number: card.invoice.number })}</span>
          <span className="ms-2 font-mono tabular-nums">{formatMoneyAuto(card.invoice.total, card.invoice.currency, locale)}</span>
        </p>
      )}

      {card.actions.length > 0 && !completing && (
        <div className="flex flex-wrap gap-2">
          {card.actions.map((a) => (
            <button key={a} type="button" onClick={() => act(a)} disabled={pending} className={buttonClasses(a === 'complete' ? 'primary' : 'outline', 'sm', small)}>
              {pending ? t('busy') : t(`actions.${a}`)}
            </button>
          ))}
        </div>
      )}

      {completing && (
        <div className="flex flex-col gap-3 border-s-4 border-awm-red bg-awm-panel p-3">
          <h4 className="text-xs font-extrabold">{t('complete.title', { number: card.number })}</h4>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-labor`} className="text-xs font-bold">{t('complete.labor')}</label>
              <input
                id={`${id}-labor`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={labor}
                onChange={(e) => { setLabor(e.target.value); setLaborError(false); }}
                aria-invalid={laborError || undefined}
                aria-describedby={`${id}-hint`}
                dir="ltr"
                className="h-9 w-full border border-awm-line bg-white px-2 text-start text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-cur`} className="text-xs font-bold">{t('complete.currency')}</label>
              <select id={`${id}-cur`} value={currency} onChange={(e) => setCurrency(e.target.value as 'USD' | 'SYP')} className="h-9 border border-awm-line bg-white px-2 text-sm">
                <option value="USD">USD</option>
                <option value="SYP">SYP</option>
              </select>
            </div>
          </div>
          <p id={`${id}-hint`} className="text-xs text-awm-muted">{t('complete.hint')}</p>
          {laborError && <p role="alert" className="text-xs font-medium text-awm-red">{t('complete.invalid')}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={complete} disabled={pending} className={buttonClasses('primary', 'sm', small)}>{pending ? t('busy') : t('complete.submit')}</button>
            <button type="button" onClick={() => { setCompleting(false); setError(null); setLaborError(false); }} disabled={pending} className={buttonClasses('outline', 'sm', small)}>{t('complete.cancel')}</button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-xs font-medium text-awm-red">{error}</p>}
    </article>
  );
}
