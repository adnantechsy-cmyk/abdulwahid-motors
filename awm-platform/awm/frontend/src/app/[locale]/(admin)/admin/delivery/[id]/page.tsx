import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PdiActions } from '@/components/admin/PdiActions';
import { PdiChecklist } from '@/components/admin/PdiChecklist';
import { PdiDetailsForm } from '@/components/admin/PdiDetailsForm';
import { Panel } from '@/components/account/Panel';
import { StatusPill } from '@/components/account/StatusPill';
import { Link } from '@/i18n/navigation';
import { adminGet, can, requirePermission } from '@/lib/api/admin';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { AdminPdiDetail } from '@/types/admin';

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function DeliveryDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requirePermission(locale, 'pdi.manage');
  if (!/^\d{1,9}$/.test(id)) notFound();

  const [t, pdi] = await Promise.all([getTranslations('admin.delivery'), adminGet<AdminPdiDetail>(`/admin/pdi/${id}`, locale)]);
  if (!pdi) notFound();

  const pct = pdi.progress.percent;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/delivery" className="text-sm font-bold text-awm-red underline underline-offset-4">{t('backToList')}</Link>
        <h1 className="mt-3 flex flex-wrap items-center gap-3 text-3xl font-extrabold">
          <span>{pdi.vehicle.name ?? t('car')}</span>
          <StatusPill code={pdi.delivered ? 'completed' : pdi.status} label={pdi.delivered ? t('delivered') : t(`statuses.${pdi.status}`)} />
        </h1>
        <p className="mt-2 text-sm text-awm-muted">
          {t('orderLabel')} <span className="font-mono font-bold" dir="ltr">{pdi.order_number}</span>
          {pdi.vehicle.vin && <> · VIN <span className="font-mono" dir="ltr">{pdi.vehicle.vin}</span></>}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel id="pdi-progress" title={t('progress')}>
          <div className="flex flex-col gap-4">
            <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('progress')} className="h-3 w-full bg-awm-panel">
              <div className={`h-full ${pdi.progress.failed > 0 ? 'bg-awm-red' : 'bg-awm-black'}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-awm-muted">
              {t('progressText', { done: formatNumber(pdi.progress.done, locale), total: formatNumber(pdi.progress.total, locale) })}
              {pdi.progress.failed > 0 && <span className="ms-2 font-bold text-awm-red">{t('failedItems', { count: pdi.progress.failed })}</span>}
            </p>
            <PdiActions pdi={pdi} canDeliver={can(user, 'orders.manage')} />
          </div>
        </Panel>

        <Panel id="pdi-customer" title={t('customer')}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
            <dt className="font-bold">{t('name')}</dt><dd>{pdi.customer?.name ?? '—'}</dd>
            <dt className="font-bold">{t('phone')}</dt><dd className="font-mono" dir="ltr">{pdi.customer?.phone ?? '—'}</dd>
            <dt className="font-bold">{t('technician')}</dt><dd>{pdi.technician ?? '—'}</dd>
            {pdi.completed_at && (<><dt className="font-bold">{t('completedAt')}</dt><dd>{formatDateTime(pdi.completed_at, locale)}</dd></>)}
            {pdi.delivered_at && (<><dt className="font-bold">{t('deliveredAt')}</dt><dd>{formatDateTime(pdi.delivered_at, locale)}</dd></>)}
          </dl>
          {!pdi.has_account && <p className="mt-4 border-s-4 border-awm-black bg-awm-panel p-3 text-xs text-awm-muted">{t('guestWarning')}</p>}
        </Panel>
      </div>

      <Panel id="pdi-checklist" title={t('checklist')}>
        <PdiChecklist items={pdi.items} closed={pdi.delivered} />
      </Panel>

      {!pdi.delivered && (
        <Panel id="pdi-details" title={t('details.title')}>
          <PdiDetailsForm pdi={pdi} />
        </Panel>
      )}
    </div>
  );
}