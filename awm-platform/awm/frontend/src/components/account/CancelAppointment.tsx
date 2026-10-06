'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

/** Two-step cancel: first click asks, second click sends. No window.confirm, so it works in every shell. */
export function CancelAppointment({ number }: { number: string }) {
  const t = useTranslations('account.appointments');
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<'idle' | 'confirm' | 'sending'>('idle');
  const [failed, setFailed] = useState(false);

  async function cancel() {
    setStep('sending');
    setFailed(false);
    try {
      const res = await fetch(`/api/account/appointments/${encodeURIComponent(number)}/cancel`, { method: 'POST', headers: { 'X-Locale': locale } });
      if (res.status === 401) {
        window.location.assign(`/api/auth/expired?next=${encodeURIComponent(`/${locale}/account/appointments`)}`);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      router.refresh();
    } catch {
      setFailed(true);
      setStep('confirm');
    }
  }

  const btn = 'h-9 whitespace-nowrap border-2 px-3 text-xs font-bold';

  return (
    <div className="flex flex-col items-start gap-2">
      {step === 'idle' ? (
        <button type="button" onClick={() => setStep('confirm')} className={`${btn} border-awm-black hover:bg-awm-black hover:text-white`}>{t('cancel')}</button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={cancel} disabled={step === 'sending'} className={`${btn} border-awm-red bg-awm-red text-white disabled:opacity-60`}>
            {step === 'sending' ? t('cancelling') : t('confirmCancel')}
          </button>
          <button type="button" onClick={() => setStep('idle')} disabled={step === 'sending'} className={`${btn} border-awm-line hover:border-awm-black`}>{t('keep')}</button>
        </div>
      )}
      {failed && <p role="alert" className="text-xs font-medium text-awm-red">{t('cancelFailed')}</p>}
    </div>
  );
}
