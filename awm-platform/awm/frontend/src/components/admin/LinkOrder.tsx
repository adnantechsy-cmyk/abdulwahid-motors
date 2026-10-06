'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { useRouter } from '@/i18n/navigation';
import { adminAction } from '@/lib/admin-client';

/** Attach a guest order to the chosen customer's account. */
export function LinkOrder({ number, customerId, customerName }: { number: string; customerId: number; customerName: string }) {
  const t = useTranslations('admin.link');
  const ta = useTranslations('admin');
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function link() {
    setBusy(true); setError(null);
    const r = await adminAction('PUT', `orders/${number}/customer`, locale, { user_id: customerId });
    if (r.ok) return router.push(`/admin/orders/${number}`);
    setBusy(false);
    setError(r.code === 'order_has_account' ? t('alreadyLinked') : r.status === 0 || r.status >= 500 ? ta('errors.unavailable') : r.message || ta('errors.generic'));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-7">{t('orderAsk', { order: number, name: customerName })}</p>
      <p className="text-xs text-awm-muted">{t('orderHint')}</p>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" disabled={busy} onClick={link} className={buttonClasses('primary', 'md')}>{busy ? ta('working') : t('linkOrder')}</button>
        {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
      </div>
    </div>
  );
}