'use client';

import { useTranslations } from 'next-intl';

/** Segment error boundary: Laravel down or an unexpected response. Expired sessions never get here (they redirect). */
export default function AccountError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('account.error');

  return (
    <div role="alert" className="flex flex-col items-start gap-4 border border-awm-line bg-white p-8">
      <h1 className="text-2xl font-extrabold">{t('title')}</h1>
      <p className="text-awm-muted">{t('text')}</p>
      <button type="button" onClick={reset} className="h-11 bg-awm-red px-6 text-sm font-bold text-white hover:bg-awm-black">{t('retry')}</button>
    </div>
  );
}
