'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/components/ui/Button';
import type { AdminAppointment } from '@/types/admin';
import { useAdminRun } from './useAdminRun';

const small = 'h-9 whitespace-nowrap px-3 text-xs';

/** Confirm, cancel, mark no-show, or check the customer in (which opens a job card). */
export function AppointmentActions({ appointment: a }: { appointment: AdminAppointment }) {
  const t = useTranslations('admin.appointments');
  const ta = useTranslations('admin');
  const { run, pending, error, setError } = useAdminRun();
  const [ask, setAsk] = useState<null | 'cancel' | 'no-show'>(null);
  const [card, setCard] = useState<string | null>(null);

  const codes = { appointment_unlinked: t('needsLink') };
  const call = (action: 'confirm' | 'cancel' | 'no-show') => run('POST', `appointments/${a.id}/${action}`, undefined, codes);

  async function checkIn() {
    const result = await run<{ job_card_number: string }>('POST', `appointments/${a.id}/check-in`, {}, codes);
    if (result.ok) setCard(result.data.job_card_number);
  }

  if (card) {
    return (
      <p role="status" className="flex flex-col gap-1 text-xs">
        <span className="font-bold">{t('checkedIn', { number: card })}</span>
        <Link href="/admin/job-cards" className="font-bold text-awm-red underline underline-offset-4">{t('viewBoard')}</Link>
      </p>
    );
  }

  const open = a.status === 'requested' || a.status === 'confirmed';
  if (!open) return <span className="text-xs text-awm-muted">—</span>;

  return (
    <div className="flex min-w-44 flex-col gap-2">
      {ask ? (
        <div className="flex flex-col gap-2 border-s-4 border-awm-red bg-awm-panel p-3">
          <p className="text-xs font-bold">{ask === 'cancel' ? t('askCancel') : t('askNoShow')}</p>
          <div className="flex gap-2">
            <button type="button" onClick={async () => { await call(ask); setAsk(null); }} disabled={pending} className={buttonClasses('primary', 'sm', small)}>{ta('yes')}</button>
            <button type="button" onClick={() => { setAsk(null); setError(null); }} disabled={pending} className={buttonClasses('outline', 'sm', small)}>{ta('back')}</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {a.status === 'requested' && <button type="button" onClick={() => call('confirm')} disabled={pending} className={buttonClasses('primary', 'sm', small)}>{t('confirm')}</button>}
          <button type="button" onClick={checkIn} disabled={pending} className={buttonClasses('dark', 'sm', small)}>{t('checkIn')}</button>
          <button type="button" onClick={() => setAsk('cancel')} disabled={pending} className={buttonClasses('outline', 'sm', small)}>{t('cancel')}</button>
          {a.status === 'confirmed' && <button type="button" onClick={() => setAsk('no-show')} disabled={pending} className={buttonClasses('outline', 'sm', small)}>{t('noShow')}</button>}
        </div>
      )}
      {error && <p role="alert" className="text-xs font-medium text-awm-red">{error}</p>}
    </div>
  );
}
