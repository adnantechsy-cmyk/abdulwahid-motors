'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Button, Field, Input, cx } from '@/components/ui/primitives';
import { syncCart } from '@/lib/api/cart';
import { ApiError, apiFetch } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { useCartStore, selectSubtotal } from '@/store/cartStore';
import type { SiteSettings } from '@/types/site';
import { Steps } from './Steps';
import { CHECKOUT_RECORD_KEY, type CheckoutRecord, type PaymentOutcome, type PlacedOrder } from './types';

type Method = { code: string; name: string; is_online: boolean };

export function CheckoutClient({ settings }: { settings: SiteSettings | null }) {
  const t = useTranslations('checkout');
  const tc = useTranslations('cart');
  const locale = useLocale() as 'ar' | 'en';
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectSubtotal);
  const clear = useCartStore((s) => s.clear);
  const [hydrated, setHydrated] = useState(false);

  const [delivery, setDelivery] = useState<'pickup' | 'delivery'>('pickup');
  const [branch, setBranch] = useState(settings?.branches[0]?.code ?? 'sahnaya');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Phase 2: orders exist, choose payment.
  const [orders, setOrders] = useState<PlacedOrder[] | null>(null);
  const [methods, setMethods] = useState<Method[]>([]);
  const [method, setMethod] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CheckoutRecord['customer'] | null>(null);
  const [snapshot, setSnapshot] = useState<CheckoutRecord['items']>([]);

  useEffect(() => setHydrated(true), []);
  const hasParts = items.some((i) => i.type === 'spare_part');
  const currency = (orders?.[0]?.currency ?? items[0]?.currency ?? 'USD');
  const money = (n: number | string) => formatMoney(n, currency, locale, 2);
  const shownItems = orders ? snapshot : items;
  const total = orders ? orders.reduce((s, o) => s + Number(o.grand_total), 0) : subtotal;

  const groups = useMemo(() => (['vehicle_reservation', 'maintenance_invoice', 'spare_part'] as const)
    .map((f) => ({ flow: f, lines: shownItems.filter((i) => i.type === f) })).filter((g) => g.lines.length), [shownItems]);

  async function placeOrders(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const c = { name: String(f.get('name') ?? '').trim(), phone: String(f.get('phone') ?? '').trim(), email: String(f.get('email') ?? '').trim() || undefined };
    const address = delivery === 'delivery' ? { city: String(f.get('city') ?? ''), area: String(f.get('area') ?? ''), street: String(f.get('street') ?? ''), details: String(f.get('details') ?? '') } : null;

    const errs: Record<string, string> = {};
    if (!c.name) errs.name = t('errors.name');
    if (!/^\+?[0-9 ]{7,20}$/.test(c.phone)) errs.phone = t('errors.phone');
    if (address && (!address.city || !address.street)) errs.address = t('errors.address');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setNotice(null);
    try {
      const server = await syncCart(locale);   // re-price from the database before committing
      if (server.dropped.length) {
        setNotice(t('itemsChanged', { n: server.dropped.length }));
        setBusy(false);
        return;
      }
      const res = await apiFetch<{ orders: PlacedOrder[] }>('/checkout', {
        method: 'POST', locale,
        body: JSON.stringify({ customer: c, shipping_address: address, branch_pickup: delivery === 'pickup' ? branch : null }),
      });
      const list = await apiFetch<Method[]>(`/orders/${res.orders[0].number}/payment-methods`, { locale });

      setSnapshot(useCartStore.getState().items);
      setCustomer(c);
      setOrders(res.orders);
      setMethods(list);
      setMethod(list[0]?.code ?? null);
      clear(); // the server cart is now converted into orders
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!orders || !method || !customer) return;
    setBusy(true);
    setNotice(null);
    try {
      const outcomes: PaymentOutcome[] = [];
      for (const o of orders) {
        const r = await apiFetch<{ payment_id: string; status: string; instructions?: PaymentOutcome['instructions']; redirect_url?: string }>(`/orders/${o.number}/pay`, {
          method: 'POST', locale,
          headers: { 'Idempotency-Key': `${o.number}:${method}`, 'X-Customer-Phone': customer.phone },
          body: JSON.stringify({ gateway: method, phone: customer.phone }),
        });
        if (r.redirect_url) { window.location.href = r.redirect_url; return; } // hosted payment page
        outcomes.push({ order: o.number, payment_id: r.payment_id, status: r.status, method: methods.find((m) => m.code === method)?.name ?? method, instructions: r.instructions });
      }
      const record: CheckoutRecord = { placedAt: new Date().toISOString(), customer, branch: delivery === 'pickup' ? branch : null, delivery, orders, payments: outcomes, items: snapshot };
      sessionStorage.setItem(CHECKOUT_RECORD_KEY, JSON.stringify(record));
      router.push('/checkout/result');
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : t('errors.generic'));
      setBusy(false);
    }
  }

  if (!hydrated) return <div className="h-96" aria-busy="true" />;

  if (!orders && items.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-6 px-4 py-20">
        <h1 className="text-3xl font-extrabold">{tc('empty')}</h1>
        <div className="flex gap-2">
          <Link href="/vehicles" className="bg-awm-black px-5 py-3 text-sm font-bold text-white hover:bg-awm-red">{tc('browseVehicles')}</Link>
          <Link href="/parts" className="border-2 border-awm-black px-5 py-3 text-sm font-bold hover:bg-awm-black hover:text-white">{tc('browseParts')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-awm-surface">
      <div className="border-b border-awm-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
          <Steps current={orders ? 3 : 2} labels={[t('steps.cart'), t('steps.details'), t('steps.payment'), t('steps.confirmation')]} />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:px-6">
        <div className="flex flex-col gap-6">
          {notice && <p role="alert" className="border-s-4 border-awm-red bg-white p-4 text-sm">{notice}</p>}

          {!orders ? (
            <form id="checkout" onSubmit={placeOrders} className="flex flex-col gap-6" noValidate>
              <section className="flex flex-col gap-5 bg-white p-6" aria-labelledby="s1">
                <header><p className="text-xs font-bold text-awm-red">{t('s1.eyebrow')}</p><h2 id="s1" className="text-xl font-extrabold">1. {t('s1.title')}</h2></header>
                <div className="grid grid-cols-2 gap-1 bg-awm-surface p-1" role="radiogroup" aria-label={t('s1.title')}>
                  {(['pickup', 'delivery'] as const).map((d) => (
                    <button key={d} type="button" role="radio" aria-checked={delivery === d} disabled={d === 'delivery' && !hasParts}
                      onClick={() => setDelivery(d)}
                      className={cx('flex h-12 items-center justify-center gap-2 text-sm font-bold disabled:opacity-40', delivery === d ? 'bg-white shadow-[inset_0_-3px_0_var(--color-awm-red)]' : 'text-awm-muted')}>
                      <Icon name={d === 'pickup' ? 'store' : 'truck'} size={16} />{t(`s1.${d}`)}
                    </button>
                  ))}
                </div>
                {!hasParts && <p className="text-xs text-awm-muted">{t('s1.deliveryPartsOnly')}</p>}

                {delivery === 'pickup' ? (
                  <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label={t('s1.branch')}>
                    {(settings?.branches ?? []).map((b) => (
                      <label key={b.code} className={cx('flex cursor-pointer gap-3 border-2 p-4', branch === b.code ? 'border-awm-red bg-awm-red/5' : 'border-awm-line')}>
                        <input type="radio" name="branch" value={b.code} checked={branch === b.code} onChange={() => setBranch(b.code)} className="mt-1 size-4 accent-awm-red" />
                        <span className="flex flex-col gap-1">
                          <span className="font-extrabold">{b.name}</span>
                          <span className="text-sm text-awm-muted">{[b.street, b.city].join(locale === 'ar' ? '، ' : ', ')}</span>
                          {settings?.values[`branches.${b.code}.hours`] && <span className="flex items-center gap-1 text-xs"><Icon name="clock" size={14} />{String(settings.values[`branches.${b.code}.hours`])}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label={t('s1.city')}><Input name="city" required autoComplete="address-level2" defaultValue={locale === 'ar' ? 'دمشق' : 'Damascus'} /></Field>
                    <Field label={t('s1.area')}><Input name="area" autoComplete="address-level3" /></Field>
                    <Field label={t('s1.street')} className="md:col-span-2" error={errors.address}><Input name="street" required autoComplete="street-address" /></Field>
                    <Field label={t('s1.details')} className="md:col-span-2"><Input name="details" placeholder={t('s1.detailsPlaceholder')} /></Field>
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-5 bg-white p-6" aria-labelledby="s2">
                <header><p className="text-xs font-bold text-awm-red">{t('s2.eyebrow')}</p><h2 id="s2" className="text-xl font-extrabold">2. {t('s2.title')}</h2></header>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label={t('s2.name')} error={errors.name}><Input name="name" required autoComplete="name" /></Field>
                  <Field label={t('s2.phone')} hint={t('s2.phoneHint')} error={errors.phone}><Input name="phone" type="tel" required dir="ltr" autoComplete="tel" placeholder="09XX XXX XXX" className="font-mono" /></Field>
                  <Field label={t('s2.email')} hint={t('optional')} className="md:col-span-2"><Input name="email" type="email" dir="ltr" autoComplete="email" /></Field>
                </div>
              </section>

              <section className="bg-white p-6 text-sm text-awm-muted" aria-labelledby="s3">
                <h2 id="s3" className="text-xl font-extrabold text-awm-black">3. {t('s3.title')}</h2>
                <p className="mt-2">{t('s3.afterOrder')}</p>
              </section>
            </form>
          ) : (
            <section className="flex flex-col gap-5 bg-white p-6" aria-labelledby="pay">
              <header>
                <p className="text-xs font-bold text-awm-red">{t('s3.eyebrow')}</p>
                <h2 id="pay" className="text-xl font-extrabold">3. {t('s3.title')}</h2>
                <p className="mt-2 text-sm text-awm-muted">{t('s3.ordersCreated', { numbers: orders.map((o) => o.number).join(locale === 'ar' ? '، ' : ', ') })}</p>
              </header>
              {methods.length === 0 ? <p role="alert" className="text-sm text-awm-red">{t('s3.noMethods')}</p> : (
                <div className="grid gap-2 md:grid-cols-2" role="radiogroup" aria-label={t('s3.title')}>
                  {methods.map((m) => (
                    <label key={m.code} className={cx('flex cursor-pointer items-start gap-3 border-2 p-4', method === m.code ? 'border-awm-red bg-awm-red/5' : 'border-awm-line')}>
                      <input type="radio" name="method" value={m.code} checked={method === m.code} onChange={() => setMethod(m.code)} className="mt-1 size-4 accent-awm-red" />
                      <span className="flex flex-col gap-1">
                        <span className="font-extrabold">{m.name}</span>
                        <span className="text-xs text-awm-muted">{m.is_online ? t('s3.online') : t('s3.offline')}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="flex items-start gap-2 text-xs text-awm-muted"><Icon name="shield" size={16} />{t('s3.noCardData')}</p>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-24" aria-labelledby="summary">
          <div className="flex flex-col gap-4 bg-white p-6">
            <h2 id="summary" className="text-lg font-extrabold">{t('summary.title', { n: shownItems.length })}</h2>
            {groups.map((g) => (
              <div key={g.flow} className="flex flex-col gap-2">
                <p className="text-xs font-bold text-awm-muted">{tc(`flows.${g.flow}`)}</p>
                {g.lines.map((i) => (
                  <div key={`${i.type}:${i.refId}`} className="flex gap-3 bg-awm-surface p-3">
                    <div className="relative size-14 shrink-0 bg-white">{i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}</div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="text-sm font-bold leading-snug">{i.name[locale] || i.name.en}</p>
                      <p className="text-xs text-awm-muted">
                        {i.type === 'vehicle_reservation' ? tc('depositOf', { price: money(i.vehiclePrice) }) : i.type === 'spare_part' ? `${t('summary.qty')}: ${i.quantity}` : tc('invoice', { number: i.invoiceNumber })}
                      </p>
                      <p className="mt-1 font-mono text-sm font-bold">{money(i.unitPrice * i.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div className="flex items-baseline justify-between bg-awm-black p-4 text-white">
              <span className="text-sm">{t('summary.dueNow')}</span>
              <span className="font-mono text-3xl font-bold">{money(total)}</span>
            </div>
            {groups.length > 1 && <p className="text-xs text-awm-muted">{tc('separateOrders')}</p>}
            {!orders ? (
              <Button type="submit" form="checkout" size="lg" disabled={busy}>{busy ? t('working') : t('placeOrder')}</Button>
            ) : (
              <Button size="lg" onClick={pay} disabled={busy || !method}>{busy ? t('working') : t('confirmPayment')}</Button>
            )}
            <ul className="flex flex-col gap-1 text-xs text-awm-muted">
              {groups.some((g) => g.flow === 'vehicle_reservation') && <li className="flex gap-2"><Icon name="check" size={14} className="text-awm-red" />{t('trust.deposit')}</li>}
              <li className="flex gap-2"><Icon name="check" size={14} className="text-awm-red" />{t('trust.prices')}</li>
            </ul>
          </div>
          {settings?.values['contact.phone'] && (
            <a href={`tel:${settings.values['contact.phone']}`} className="flex items-center justify-between gap-3 bg-white p-5 hover:bg-awm-black hover:text-white">
              <span className="flex items-center gap-3"><Icon name="phone" /><span className="font-bold">{t('help')}</span></span>
              <span className="font-mono font-bold" dir="ltr">{String(settings.values['contact.phone'])}</span>
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
