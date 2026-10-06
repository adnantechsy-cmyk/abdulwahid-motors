'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { useAdminRun } from './useAdminRun';

/** Cancel a certificate (a wrong reading, a swapped car). The public verification page then shows it as revoked. */
export function RevokeCertificate({ id, number }: { id: number; number: string }) {
  const t = useTranslations('admin.battery');
  const ta = useTranslations('admin');
  const { run, pending, error, setError } = useAdminRun();
  const [ask, setAsk] = useState(false);

  if (!ask) {
    return <button type="button" onClick={() => setAsk(true)} className={buttonClasses('outline', 'sm', 'h-9 px-3 text-xs')}>{t('revoke')}<span className="sr-only"> {number}</span></button>;
  }

  return (
    <div role="group" aria-label={t('revokeAsk', { number })} className="flex min-w-48 flex-col gap-2 border-s-4 border-awm-black bg-awm-panel p-3">
      <p className="text-xs font-bold">{t('revokeAsk', { number })}</p>
      <p className="text-xs text-awm-muted">{t('revokeHint')}</p>
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => run('POST', `battery-inspections/${id}/revoke`)} className={buttonClasses('dark', 'sm', 'h-9 px-3 text-xs')}>{pending ? ta('working') : t('revokeYes')}</button>
        <button type="button" disabled={pending} onClick={() => { setAsk(false); setError(null); }} className={buttonClasses('outline', 'sm', 'h-9 px-3 text-xs')}>{ta('back')}</button>
      </div>
      {error && <p role="alert" className="text-xs font-medium text-awm-red">{error}</p>}
    </div>
  );
}