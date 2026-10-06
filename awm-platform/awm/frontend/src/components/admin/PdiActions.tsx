'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import type { AdminPdiDetail } from '@/types/admin';
import { useAdminRun } from './useAdminRun';

type Props = { pdi: AdminPdiDetail; canDeliver: boolean };

/**
 * What can be done next with this inspection. Complete needs every item checked; Deliver needs a passed
 * inspection, marks the car sold, closes the order and (for orders with an account) adds the car to the customer's cars.
 */
export function PdiActions({ pdi, canDeliver }: Props) {
  const t = useTranslations('admin.delivery');
  const ta = useTranslations('admin');
  const { run, pending, error, setError } = useAdminRun();
  const [ask, setAsk] = useState<null | 'deliver'>(null);

  const codes = {
    pdi_bad_state: t('codes.badState'),
    pdi_incomplete: t('codes.incomplete'),
    pdi_not_passed: t('codes.notPassed'),
    pdi_closed: t('closed'),
  };
  const path = `pdi/${pdi.id}`;
  const left = pdi.progress.total - pdi.progress.done;

  if (pdi.delivered) return <p role="status" className="font-bold">{t('deliveredNote')}</p>;

  return (
    <div className="flex flex-col gap-4">
      {ask === null ? (
        <div className="flex flex-wrap gap-3">
          {pdi.status === 'pending' && <button type="button" disabled={pending} onClick={() => run('POST', `${path}/start`, undefined, codes)} className={buttonClasses('outline', 'md')}>{pending ? ta('working') : t('start')}</button>}
          {(pdi.status === 'pending' || pdi.status === 'in_progress') && (
            <button type="button" disabled={pending || left > 0} onClick={() => run('POST', `${path}/complete`, undefined, codes)} className={buttonClasses('primary', 'md')} aria-describedby="pdi-left">
              {pending ? ta('working') : t('complete')}
            </button>
          )}
          {pdi.status === 'failed' && <p className="max-w-xl text-sm font-medium">{t('failedHelp')}</p>}
          {pdi.status === 'passed' && canDeliver && <button type="button" disabled={pending} onClick={() => setAsk('deliver')} className={buttonClasses('dark', 'md')}>{t('deliver')}</button>}
          {pdi.status === 'passed' && !canDeliver && <p className="text-sm text-awm-muted">{t('deliverNeedsSales')}</p>}
        </div>
      ) : (
        <div role="group" aria-label={t('deliverAsk')} className="flex max-w-xl flex-col gap-3 border-s-4 border-awm-red bg-awm-panel p-4">
          <p className="font-bold">{t('deliverAsk', { order: pdi.order_number ?? '' })}</p>
          <p className="text-sm text-awm-muted">{pdi.has_account ? t('deliverWithAccount') : t('deliverGuest')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={async () => { const r = await run('POST', `${path}/deliver`, undefined, codes); if (r.ok) setAsk(null); }} className={buttonClasses('primary', 'sm', 'h-10 px-4 text-sm')}>{pending ? ta('working') : t('deliverYes')}</button>
            <button type="button" disabled={pending} onClick={() => { setAsk(null); setError(null); }} className={buttonClasses('outline', 'sm', 'h-10 px-4 text-sm')}>{ta('back')}</button>
          </div>
        </div>
      )}

      {(pdi.status === 'pending' || pdi.status === 'in_progress') && <p id="pdi-left" className="text-sm text-awm-muted">{left > 0 ? t('itemsLeft', { count: left }) : t('allChecked')}</p>}
      {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
    </div>
  );
}