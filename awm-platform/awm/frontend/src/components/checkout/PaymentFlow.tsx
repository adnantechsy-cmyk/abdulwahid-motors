'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { TextField } from '@/components/ui/Field';
import { buttonClasses } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/client';
import { shopFetch } from '@/lib/api/shop';
import {
  idempotencyKeyFor,
  loadPayment,
  loadSession,
  savePayment,
  type PaymentInstructions,
  type PaymentRecord,
  type PlacedOrder,
} from '@/lib/checkout-session';
import { formatMoneyAuto } from '@/lib/format';

type Method = { code: string; name: string; is_online: boolean };
type PayResponse = { payment_id: string; status: string; client_secret?: string; redirect_url?: string; instructions?: PaymentInstructions };

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/** Only follow a gateway redirect to a plain http(s) URL. */
const safeRedirect = (url: string) => /^https?:\/\//i.test(url);

export function PaymentFlow({ number, signedIn, initial }: { number: string; signedIn: boolean; initial: PlacedOrder | null }) {
  const t = useTranslations('pay');
  const locale = useLocale();

  const [order, setOrder] = useState<PlacedOrder | null>(initial);
  const [others, setOthers] = useState<PlacedOrder[]>([]);
  const [phone, setPhone] = useState('');
  const [methods, setMethods] = useState<Method[] | null>(null);
  const [gateway, setGateway] = useState('');
  const [record, setRecord] = useState<PaymentRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Restore what this tab already knows about the order and any payment already started.
  useEffect(() => {
    const session = loadSession();
    const mine = session?.orders.find((o) => o.number === number) ?? null;
    if (mine) setOrder((current) => current ?? mine);
    setOthers((session?.orders ?? []).filter((o) => o.number !== number));
    if (session?.phone && mine) setPhone(session.phone);
    setRecord(loadPayment(number));
  }, [number]);

  useEffect(() => {
    shopFetch<Method[]>(`orders/${number}/payment-methods`, { locale })
      .then((list) => {
        setMethods(list);
        if (list.length === 1) setGateway(list[0].code);
      })
      .catch(() => setMethods([]));
  }, [number, locale]);

  const errorFor = (e: unknown): string => {
    if (e instanceof ApiError) {
      if (e.status === 403) return t('errors.forbidden');
      if (e.status === 429) return t('errors.tooMany');
      if (e.code && t.has(`errors.codes.${e.code}`)) return t(`errors.codes.${e.code}`);
    }
    return t('errors.generic');
  };

  async function choose(event: FormEvent) {
    event.preventDefault();
    if (!gateway) return setError(t('errors.chooseMethod'));
    if (!signedIn && !phone.trim()) return setError(t('errors.phone'));

    setPending(true);
    setError(null);
    try {
      const res = await shopFetch<PayResponse>(`orders/${number}/pay`, {
        method: 'POST',
        locale,
        headers: { 'Idempotency-Key': idempotencyKeyFor(number, gateway) },
        json: { gateway, ...(signedIn ? {} : { phone: phone.trim() }) },
      });

      if (res.client_secret) {
        setError(t('errors.cardUnsupported'));
        setPending(false);
        return;
      }
      const next: PaymentRecord = { payment_id: res.payment_id, status: res.status, gateway, instructions: res.instructions };
      savePayment(number, next);
      setRecord(next);

      if (res.redirect_url && safeRedirect(res.redirect_url)) {
        window.location.assign(res.redirect_url);
        return;
      }
    } catch (e) {
      setError(errorFor(e));
    }
    setPending(false);
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!record || !file) return setError(t('errors.chooseFile'));
    if (!PROOF_TYPES.includes(file.type)) return setError(t('errors.fileType'));
    if (file.size > MAX_PROOF_BYTES) return setError(t('errors.fileSize'));

    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('proof', file);
      if (!signedIn) form.append('phone', phone.trim());
      await shopFetch(`payments/${record.payment_id}/proof`, { method: 'POST', locale, form });
      const done = { ...record, proofUploaded: true };
      savePayment(number, done);
      setRecord(done);
    } catch (e) {
      setError(errorFor(e));
    }
    setPending(false);
  }

  const money = (o: { grand_total?: string; amount?: string; currency: string }) => formatMoneyAuto(o.grand_total ?? o.amount ?? '0', o.currency, locale);
  const guestPhoneField = !signedIn && (
    <TextField
      name="phone"
      type="tel"
      label={t('phone')}
      hint={t('phoneHint')}
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
      autoComplete="tel"
      inputMode="tel"
      dir="ltr"
      className="text-start"
    />
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">
      <div className="flex flex-col gap-6">
        {error && <p role="alert" className="border-s-4 border-awm-red bg-awm-panel p-4 text-sm font-medium">{error}</p>}

        {/* Step 1: choose how to pay */}
        {!record && (
          <form onSubmit={choose} noValidate className="flex flex-col gap-5 border border-awm-line bg-white p-6">
            <h2 className="flex items-center gap-3 text-lg font-extrabold"><span aria-hidden="true" className="h-5 w-1 bg-awm-red" />{t('chooseMethod')}</h2>

            {methods === null && <p className="text-awm-muted" role="status">{t('loading')}</p>}
            {methods?.length === 0 && <p className="text-awm-muted">{t('noMethods')}</p>}

            {methods && methods.length > 0 && (
              <div role="radiogroup" aria-label={t('chooseMethod')} className="flex flex-col gap-3">
                {methods.map((m) => (
                  <label key={m.code} className={`flex cursor-pointer items-center gap-3 border-2 p-4 text-sm font-bold ${gateway === m.code ? 'border-awm-red bg-awm-panel' : 'border-awm-line'}`}>
                    <input type="radio" name="gateway" value={m.code} checked={gateway === m.code} onChange={() => setGateway(m.code)} className="size-5 accent-awm-red" />
                    {m.name}
                  </label>
                ))}
              </div>
            )}

            {methods && methods.length > 0 && guestPhoneField}

            <button type="submit" disabled={pending || !methods?.length} className={buttonClasses('primary', 'lg', 'w-full')}>
              {pending ? t('continuing') : t('continue')}
            </button>
          </form>
        )}

        {/* Step 2: pay offline, then upload the receipt */}
        {record && (
          <section aria-labelledby="instr-title" className="flex flex-col gap-6 border border-awm-line bg-white p-6">
            <h2 id="instr-title" className="flex items-center gap-3 text-lg font-extrabold"><span aria-hidden="true" className="h-5 w-1 bg-awm-red" />{t('instructions')}</h2>

            {record.instructions ? (
              <>
                <dl className="grid grid-cols-2 gap-3">
                  <div className="border border-awm-line p-4"><dt className="text-xs text-awm-muted">{t('reference')}</dt><dd className="mt-1 break-all font-mono font-bold" dir="ltr">{record.instructions.reference}</dd></div>
                  <div className="border border-awm-line p-4"><dt className="text-xs text-awm-muted">{t('amount')}</dt><dd className="mt-1 font-mono font-bold tabular-nums">{money(record.instructions)}</dd></div>
                </dl>
                {record.instructions.details && <p className="whitespace-pre-line text-sm leading-7">{record.instructions.details}</p>}
              </>
            ) : (
              <p className="text-sm leading-7">{t('resumed', { number })}</p>
            )}

            {record.proofUploaded ? (
              <p role="status" className="border-s-4 border-awm-black bg-awm-panel p-4 text-sm font-bold">{t('uploaded')}</p>
            ) : (
              <form onSubmit={upload} noValidate className="flex flex-col gap-4 border-t border-awm-line pt-6">
                <h3 className="font-extrabold">{t('uploadTitle')}</h3>
                {guestPhoneField}
                <div className="flex flex-col gap-2">
                  <label htmlFor="proof" className="text-sm font-bold">{t('file')}</label>
                  <input
                    id="proof"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    aria-describedby="proof-hint"
                    className="block w-full border border-awm-line bg-white p-3 text-sm file:me-4 file:border-0 file:bg-awm-black file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                  />
                  <p id="proof-hint" className="text-xs text-awm-muted">{t('uploadHint')}</p>
                </div>
                <button type="submit" disabled={pending} className={buttonClasses('primary', 'md', 'w-full sm:w-fit')}>{pending ? t('uploading') : t('upload')}</button>
              </form>
            )}
          </section>
        )}
      </div>

      <aside className="flex flex-col gap-6">
        <section aria-labelledby="order-title" className="border border-awm-line bg-white p-6">
          <h2 id="order-title" className="mb-4 text-lg font-extrabold">{t('order', { number })}</h2>
          {order && (
            <dl className="flex items-baseline justify-between border-t-2 border-awm-black pt-4">
              <dt className="font-bold">{t('amount')}</dt>
              <dd className="font-mono text-2xl font-extrabold tabular-nums">{money(order)}</dd>
            </dl>
          )}
          {signedIn && (
            <Link href={`/account/orders/${number}`} className="mt-4 inline-block text-sm font-bold text-awm-red underline underline-offset-4">{t('viewOrder')}</Link>
          )}
        </section>

        {others.length > 0 && (
          <section aria-labelledby="others-title" className="border border-awm-line bg-white p-6">
            <h2 id="others-title" className="mb-2 text-lg font-extrabold">{t('otherOrders')}</h2>
            <p className="mb-4 text-sm text-awm-muted">{t('otherOrdersHint')}</p>
            <ul className="flex flex-col divide-y divide-awm-line">
              {others.map((o) => (
                <li key={o.number} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span><span className="block font-mono font-bold" dir="ltr">{o.number}</span><span className="font-mono text-awm-muted tabular-nums">{money(o)}</span></span>
                  <Link href={`/checkout/pay/${o.number}`} className={buttonClasses('outline', 'sm')}>{t('pay')}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
