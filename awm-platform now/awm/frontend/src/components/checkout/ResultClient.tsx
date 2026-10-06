'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Badge, cx } from '@/components/ui/primitives';
import { ApiError, apiFetch } from '@/lib/api/client';
import { formatDate, formatMoney } from '@/lib/format';
import { Steps } from './Steps';
import { CHECKOUT_RECORD_KEY, type CheckoutRecord, type PaymentOutcome } from './types';

/** Figma 1:19812, adapted: honest about payment state, no VAT/ZATCA invoice. */
export function ResultClient() {
  const t = useTranslations('checkoutResult');
  const tc = useTranslations('checkout');
  const tCart = useTranslations('cart');
  const locale = useLocale() as 'ar' | 'en';
  const [record, setRecord] = useState<CheckoutRecord | null | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CHECKOUT_RECORD_KEY);
      setRecord(raw ? (JSON.parse(raw) as CheckoutRecord) : null);
    } catch {
      setRecord(null);
    }
  }, []);

  if (record === undefined) return <div className="h-96" aria-busy="true" />;
  if (record === null) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-20">
        <h1 className="text-2xl font-extrabold">{t('missingTitle')}</h1>
        <p className="text-awm-muted">{t('missingBody')}</p>
        <Link href="/account" className="bg-awm-black px-5 py-3 text-sm font-bold text-white hover:bg-awm-red">{t('myOrders')}</Link>
      </div>
    );
  }

  const paid = record.payments.every((p) => p.status === 'captured');
  const currency = record.orders[0]?.currency ?? 'USD';
  const money = (n: number | string) => formatMoney(n, currency, locale, 2);
  const total = record.orders.reduce((s, o) => s + Number(o.grand_total), 0);
  const hasCar = record.orders.some((o) => o.flow === 'vehicle_reservation');

  return (
    <div className="bg-awm-surface">
      <div className="border-b border-awm-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
          <Steps current={paid ? 5 : 4} labels={[tc('steps.cart'), tc('steps.details'), tc('steps.payment'), tc('steps.confirmation')]} />
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 lg:px-6">
        <section className="flex flex-col gap-6 bg-white p-6 md:flex-row md:items-start md:justify-between lg:p-10" aria-labelledby="result-title">
          <div className="flex gap-5">
            <span className={cx('flex size-14 shrink-0 items-center justify-center text-white', paid ? 'bg-awm-red' : 'bg-awm-black')}><Icon name={paid ? 'check' : 'clock'} size={28} /></span>
            <div className="flex flex-col gap-3">
              <Badge tone={paid ? 'red' : 'dark'} className="self-start">{paid ? t('paidBadge') : t('pendingBadge')}</Badge>
              <h1 id="result-title" className="text-3xl font-extrabold lg:text-4xl">{paid ? t('paidTitle') : t('pendingTitle')}</h1>
              <p className="max-w-2xl leading-7 text-awm-muted">
                {paid ? t('paidBody', { phone: record.customer.phone }) : t('pendingBody', { phone: record.customer.phone })}
              </p>
            </div>
          </div>
          <dl className="flex shrink-0 flex-col gap-3 bg-awm-surface p-5">
            {record.orders.map((o) => (
              <div key={o.number}>
                <dt className="text-xs text-awm-muted">{tCart(`flows.${o.flow}`)}</dt>
                <dd className="font-mono text-xl font-bold text-awm-red">#{o.number}</dd>
              </div>
            ))}
            <div className="border-t border-awm-line pt-3"><dt className="text-xs text-awm-muted">{t('placedAt')}</dt><dd className="font-mono text-sm">{formatDate(record.placedAt, locale, true)}</dd></div>
          </dl>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="flex flex-col gap-6">
            {record.payments.filter((p) => p.instructions).map((p) => (
              <PaymentInstructions key={p.payment_id} outcome={p} phone={record.customer.phone} />
            ))}

            <section className="flex flex-col gap-4 bg-white p-6" aria-labelledby="lines">
              <h2 id="lines" className="text-lg font-extrabold">{t('lines')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead className="bg-awm-surface text-xs text-awm-muted"><tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-start">
                    <th>{t('col.item')}</th><th>{t('col.qty')}</th><th className="!text-end">{t('col.amount')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-awm-line">
                    {record.items.map((i) => (
                      <tr key={`${i.type}:${i.refId}`}>
                        <td className="px-3 py-3">
                          <p className="font-bold">{i.name[locale] || i.name.en}</p>
                          <p className="text-xs text-awm-muted">{i.type === 'vehicle_reservation' ? tCart('depositOf', { price: money(i.vehiclePrice) }) : i.type === 'spare_part' ? i.sku : tCart('invoice', { number: i.invoiceNumber })}</p>
                        </td>
                        <td className="px-3 py-3 font-mono">{i.quantity}</td>
                        <td className="px-3 py-3 text-end font-mono font-bold">{money(i.unitPrice * i.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-baseline justify-between border-t-2 border-awm-black pt-4">
                <span className="font-extrabold">{paid ? t('totalPaid') : t('totalDue')}</span>
                <span className="font-mono text-3xl font-bold text-awm-red">{money(total)}</span>
              </div>
              <p className="text-xs text-awm-muted">{t('method')}: {record.payments[0]?.method}</p>
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            {record.branch && (
              <section className="flex flex-col gap-2 bg-white p-6">
                <p className="text-xs text-awm-muted">{t('pickupAt')}</p>
                <p className="text-lg font-extrabold">{t(`branches.${record.branch}`)}</p>
                <p className="text-sm text-awm-muted">{t('pickupNote')}</p>
              </section>
            )}

            {hasCar && (
              <section className="flex flex-col gap-3 bg-white p-6" aria-labelledby="next">
                <h2 id="next" className="text-lg font-extrabold">{t('carSteps.title')}</h2>
                <ol className="flex flex-col gap-2">
                  {(['confirmed', 'pdi', 'ownership', 'handover'] as const).map((s, idx) => (
                    <li key={s} className={cx('flex gap-3 border p-3', idx === 0 ? 'border-s-4 border-awm-line border-s-awm-red bg-awm-surface' : 'border-awm-line')}>
                      <span className="flex size-7 shrink-0 items-center justify-center bg-awm-black font-mono text-xs font-bold text-white">{idx === 0 ? <Icon name="check" size={14} /> : String(idx + 1).padStart(2, '0')}</span>
                      <span className="flex flex-col">
                        <span className="text-sm font-bold">{t(`carSteps.${s}.title`)}</span>
                        <span className="text-xs text-awm-muted">{t(`carSteps.${s}.body`)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-awm-muted">{t('carSteps.bring')}</p>
              </section>
            )}

            <Link href="/account" className="flex h-14 items-center justify-center gap-2 bg-awm-red font-bold text-white hover:bg-awm-black"><Icon name="radar" />{t('track')}</Link>
            <Link href="/vehicles" className="flex h-12 items-center justify-center border-2 border-awm-black text-sm font-bold hover:bg-awm-black hover:text-white">{t('backToShowroom')}</Link>
          </aside>
        </div>
      </div>
    </div>
  );
}

/** Bank / mobile-money instructions + receipt upload (sends the payment to the staff confirmation queue). */
function PaymentInstructions({ outcome, phone }: { outcome: PaymentOutcome; phone: string }) {
  const t = useTranslations('checkoutResult.instructions');
  const locale = useLocale();
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const i = outcome.instructions!;

  async function upload(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append('proof', file);
    fd.append('phone', phone);
    setState('uploading');
    try {
      await apiFetch(`/payments/${outcome.payment_id}/proof`, { method: 'POST', body: fd, locale, headers: { 'X-Customer-Phone': phone } });
      setState('done');
    } catch (e) {
      setError(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : t('error'));
      setState('error');
    }
  }

  return (
    <section className="flex flex-col gap-4 border-s-4 border-awm-red bg-white p-6" aria-labelledby={`pay-${outcome.order}`}>
      <h2 id={`pay-${outcome.order}`} className="text-lg font-extrabold">{t('title', { method: outcome.method })}</h2>
      <dl className="grid gap-px bg-awm-line text-sm sm:grid-cols-2">
        <div className="bg-awm-surface p-3"><dt className="text-xs text-awm-muted">{t('amount')}</dt><dd className="font-mono text-xl font-bold">{formatMoney(i.amount, i.currency, locale, 2)}</dd></div>
        <div className="bg-awm-surface p-3"><dt className="text-xs text-awm-muted">{t('reference')}</dt><dd className="font-mono text-xl font-bold">{i.reference}</dd></div>
      </dl>
      {i.details && <p className="whitespace-pre-line text-sm leading-7">{i.details}</p>}
      <p className="text-sm text-awm-muted">{t('quoteReference')}</p>

      {state === 'done' ? (
        <p role="status" className="flex items-center gap-2 text-sm font-bold text-awm-ok"><Icon name="check" size={16} />{t('uploaded')}</p>
      ) : (
        <label className={cx('flex cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-awm-black p-4 text-sm font-bold hover:bg-awm-surface', state === 'uploading' && 'pointer-events-none opacity-50')}>
          <Icon name="upload" className="text-awm-red" />
          {state === 'uploading' ? t('uploading') : t('upload')}
          <input type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      )}
      {error && <p role="alert" className="text-sm text-awm-red">{error}</p>}
    </section>
  );
}
