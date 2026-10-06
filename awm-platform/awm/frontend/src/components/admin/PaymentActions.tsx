'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { useAdminRun } from './useAdminRun';

type Props = { paymentId: string; orderNumber: string; amountLabel: string };

/**
 * Confirm or reject one payment. Both ask once more before sending: confirming marks an order paid,
 * and a mis-click on a money action is worse than one extra click.
 */
export function PaymentActions({ paymentId, orderNumber, amountLabel }: Props) {
  const t = useTranslations('admin.payments');
  const ta = useTranslations('admin');
  const { run, pending, error, setError } = useAdminRun();
  const [mode, setMode] = useState<'idle' | 'confirm' | 'reject'>('idle');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);

  const codes = { bad_state: t('badState') };
  const small = 'h-9 whitespace-nowrap px-3 text-xs';

  async function confirm() {
    await run('POST', `payments/${paymentId}/confirm`, undefined, codes);
  }

  async function reject() {
    if (!reason.trim()) return setReasonError(true);
    setReasonError(false);
    await run('POST', `payments/${paymentId}/reject`, { reason: reason.trim() }, codes);
  }

  return (
    <div className="flex min-w-48 flex-col gap-2">
      {mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode('confirm')} className={buttonClasses('primary', 'sm', small)}>{t('confirm')}</button>
          <button type="button" onClick={() => setMode('reject')} className={buttonClasses('outline', 'sm', small)}>{t('reject')}</button>
        </div>
      )}

      {mode === 'confirm' && (
        <div className="flex flex-col gap-2 border-s-4 border-awm-red bg-awm-panel p-3">
          <p className="text-xs font-bold">{t('confirmAsk', { amount: amountLabel, order: orderNumber })}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={confirm} disabled={pending} className={buttonClasses('primary', 'sm', small)}>{pending ? t('confirming') : t('confirmYes')}</button>
            <button type="button" onClick={() => { setMode('idle'); setError(null); }} disabled={pending} aria-label={ta('back')} className={buttonClasses('outline', 'sm', small)}>✕</button>
          </div>
        </div>
      )}

      {mode === 'reject' && (
        <div className="flex flex-col gap-2 border-s-4 border-awm-black bg-awm-panel p-3">
          <label htmlFor={`reason-${paymentId}`} className="text-xs font-bold">{t('rejectReason')}</label>
          <textarea
            id={`reason-${paymentId}`}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setReasonError(false); }}
            rows={2}
            maxLength={500}
            aria-invalid={reasonError || undefined}
            aria-describedby={`reason-hint-${paymentId}`}
            className="w-full border border-awm-line bg-white p-2 text-sm"
          />
          <p id={`reason-hint-${paymentId}`} className="text-xs text-awm-muted">{t('rejectHint')}</p>
          {reasonError && <p role="alert" className="text-xs font-medium text-awm-red">{t('reasonRequired')}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={reject} disabled={pending} className={buttonClasses('dark', 'sm', small)}>{pending ? t('rejecting') : t('rejectYes')}</button>
            <button type="button" onClick={() => { setMode('idle'); setError(null); setReasonError(false); }} disabled={pending} aria-label={ta('back')} className={buttonClasses('outline', 'sm', small)}>✕</button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-xs font-medium text-awm-red">{error}</p>}
    </div>
  );
}
