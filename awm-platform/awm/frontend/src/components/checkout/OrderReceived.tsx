'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ButtonLink } from '@/components/ui/Button';
import { loadSession, type PlacedOrder } from '@/lib/checkout-session';
import { formatMoneyAuto } from '@/lib/format';
import { useLocale } from 'next-intl';

/**
 * "Your request was received". The website only captures the order; the sales team calls the customer, agrees
 * the details and takes payment. All orders from this checkout are listed (a cart can split by type).
 */
export function OrderReceived({ number, signedIn, whatsappHref, phone }: { number: string; signedIn: boolean; whatsappHref: string | null; phone: string | null }) {
  const t = useTranslations('received');
  const locale = useLocale();
  const [orders, setOrders] = useState<PlacedOrder[]>([{ number, flow: '', currency: 'USD', grand_total: '' }]);

  useEffect(() => {
    const placed = loadSession()?.orders ?? [];
    if (placed.some((o) => o.number === number)) setOrders(placed);
  }, [number]);

  return (
    <div className="flex flex-col gap-8">
      <div role="status" className="border border-awm-line border-s-4 border-s-awm-red bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-extrabold">{t('headline')}</h2>
        <p className="mt-3 max-w-2xl leading-8 text-awm-muted">{t('text')}</p>
        <ul className="mt-6 flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.number} className="flex flex-wrap items-center justify-between gap-3 border border-awm-line bg-awm-panel p-4">
              <span>
                <span className="block text-xs font-bold text-awm-muted">{t('orderNumber')}</span>
                <span className="font-mono text-lg font-extrabold" dir="ltr">{o.number}</span>
              </span>
              <span className="text-sm font-bold">{o.flow ? t(`flows.${o.flow}`) : ''}</span>
              {o.grand_total && <span className="font-mono font-bold tabular-nums">{formatMoneyAuto(o.grand_total, o.currency, locale)}</span>}
            </li>
          ))}
        </ul>
      </div>

      <section aria-labelledby="next-title" className="border border-awm-line bg-white p-6 sm:p-8">
        <h2 id="next-title" className="mb-4 text-xl font-extrabold">{t('nextTitle')}</h2>
        <ol className="flex list-decimal flex-col gap-3 ps-6 leading-7 text-awm-muted">
          <li>{t('step1')}</li>
          <li>{t('step2')}</li>
          <li>{t('step3')}</li>
        </ol>
        <p className="mt-6 text-sm text-awm-muted">{signedIn ? t('trackSignedIn') : t('trackGuest')}</p>
      </section>

      <div className="flex flex-wrap gap-3">
        {signedIn ? <ButtonLink href="/account/orders" size="lg">{t('viewOrders')}</ButtonLink> : <ButtonLink href="/register" size="lg">{t('createAccount')}</ButtonLink>}
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-14 items-center justify-center border-2 border-awm-black px-8 text-base font-bold hover:bg-awm-black hover:text-white">
            {t('whatsapp')}<span className="sr-only"> ({t('opensNewTab')})</span>
          </a>
        )}
        {phone && <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="inline-flex h-14 items-center justify-center border-2 border-awm-black px-8 text-base font-bold hover:bg-awm-black hover:text-white" dir="ltr">{phone}</a>}
        <Link href="/" className="inline-flex h-14 items-center px-4 text-base font-bold text-awm-red underline underline-offset-4">{t('home')}</Link>
      </div>
    </div>
  );
}
