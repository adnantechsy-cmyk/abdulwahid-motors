'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import type { AdminOrderDetail } from '@/types/admin';
import { useAdminRun } from './useAdminRun';

type Props = { order: AdminOrderDetail; amountLabel: string };

type Ask = null | 'payment' | 'cancel';

const small = 'h-9 whitespace-nowrap px-3 text-xs';
const METHODS = ['in_person', 'bank_transfer', 'mobile_money'] as const;

/**
 * Next steps for one order. Payment is taken by the sales head outside the website, so the main action is
 * "record payment received"; it asks once more because it marks the order paid. Everything else follows the
 * order's status as decided by Laravel (`actions`), never guessed here.
 */
export function OrderActions({ order, amountLabel }: Props) {
  const t = useTranslations('admin.orders');
  const ta = useTranslations('admin');
  const { run, pending, error, setError } = useAdminRun();
  const [ask, setAsk] = useState<Ask>(null);
  const [method, setMethod] = useState<(typeof METHODS)[number]>('in_person');
  const [note, setNote] = useState('');
  const id = useId();
  const { record_payment, advance, cancel } = order.actions;
  const path = `orders/${order.number}`;
  const codes = { order_not_payable: t('notPayable'), bad_transition: t('badTransition'), not_cancellable: t('notCancellable') };

  if (!record_payment && advance.length === 0 && !cancel) return <p className="text-sm text-awm-muted">{t('noActions')}</p>;

  const close = () => { setAsk(null); setError(null); };

  return (
    <div className="flex flex-col gap-4">
      {ask === null && (
        <div className="flex flex-wrap gap-3">
          {record_payment && <button type="button" onClick={() => setAsk('payment')} className={buttonClasses('primary', 'md')}>{t('recordPayment')}</button>}
          {advance.map((next) => (
            <button
              key={next}
              type="button"
              disabled={pending}
              onClick={() => run('PUT', `${path}/status`, { status: next }, codes)}
              className={buttonClasses(next === 'fulfilled' ? 'dark' : 'outline', 'md')}
            >
              {pending ? ta('working') : t(`advance.${order.flow === 'spare_part' && next === 'fulfilled' ? 'handedOver' : next}`)}
            </button>
          ))}
          {cancel && <button type="button" onClick={() => setAsk('cancel')} className={buttonClasses('outline', 'md')}>{t('cancelOrder')}</button>}
        </div>
      )}

      {ask === 'payment' && (
        <div role="group" aria-labelledby={`${id}-pay`} className="flex max-w-md flex-col gap-3 border-s-4 border-awm-red bg-awm-panel p-4">
          <p id={`${id}-pay`} className="text-sm font-bold">{t('paymentAsk', { amount: amountLabel, order: order.number })}</p>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-method`} className="text-xs font-bold">{t('method')}</label>
            <select id={`${id}-method`} value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="h-10 border border-awm-line bg-white px-2 text-sm">
              {METHODS.map((m) => <option key={m} value={m}>{t(`methods.${m}`)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-note`} className="text-xs font-bold">{t('note')}</label>
            <input id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="h-10 border border-awm-line bg-white px-3 text-sm" aria-describedby={`${id}-note-hint`} />
            <p id={`${id}-note-hint`} className="text-xs text-awm-muted">{t('noteHint')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={async () => { const r = await run('POST', `${path}/payment`, { method, note: note.trim() || undefined }, codes); if (r.ok) close(); }}
              className={buttonClasses('primary', 'sm', small)}
            >
              {pending ? ta('working') : t('paymentYes')}
            </button>
            <button type="button" onClick={close} disabled={pending} className={buttonClasses('outline', 'sm', small)}>{ta('back')}</button>
          </div>
        </div>
      )}

      {ask === 'cancel' && (
        <div role="group" aria-labelledby={`${id}-cancel`} className="flex max-w-md flex-col gap-3 border-s-4 border-awm-black bg-awm-panel p-4">
          <p id={`${id}-cancel`} className="text-sm font-bold">{t('cancelAsk', { order: order.number })}</p>
          <p className="text-xs text-awm-muted">{t('cancelHint')}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={async () => { const r = await run('POST', `${path}/cancel`, undefined, codes); if (r.ok) close(); }}
              className={buttonClasses('dark', 'sm', small)}
            >
              {pending ? ta('working') : t('cancelYes')}
            </button>
            <button type="button" onClick={close} disabled={pending} className={buttonClasses('outline', 'sm', small)}>{ta('back')}</button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
    </div>
  );
}
