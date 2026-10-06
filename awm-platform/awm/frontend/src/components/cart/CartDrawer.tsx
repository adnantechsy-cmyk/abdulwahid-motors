'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { modeKey } from '@/lib/checkout-mode';
import { formatMoney } from '@/lib/format';
import { selectSubtotal, useCartStore, type CartItem, type CartItemType } from '@/store/cartStore';

const FLOW_ORDER: CartItemType[] = ['vehicle_reservation', 'maintenance_invoice', 'spare_part'];

/**
 * Slide-over cart. Slides in from the inline-end edge: right in English, left in Arabic.
 * Lines are grouped by flow because checkout creates one order per group.
 */
export function CartDrawer() {
  const t = useTranslations('cart');
  const locale = useLocale();
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectSubtotal);
  // Derived here, not in a selector: a selector returning fresh arrays would re-render forever.
  const groups = useMemo(
    () => Object.fromEntries(FLOW_ORDER.map((f) => [f, items.filter((i) => i.type === f)])) as Record<CartItemType, CartItem[]>,
    [items],
  );
  const closeBtn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const currency = items[0]?.currency ?? 'USD';
  const money = (n: number) => formatMoney(n, currency, locale);
  const flowsInCart = FLOW_ORDER.filter((f) => groups[f].length > 0);

  // Focus management, Escape to close, background scroll lock.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab' || !panel.current) return;
      const focusables = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input');
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, [isOpen, close]);

  return (
    <div className={isOpen ? '' : 'pointer-events-none'} aria-hidden={!isOpen}>
      <div
        onClick={close}
        className={`fixed inset-0 z-40 bg-awm-black/60 transition-opacity duration-200 motion-reduce:transition-none ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        inert={!isOpen}
        className={`fixed inset-y-0 end-0 z-50 flex w-full max-w-md flex-col bg-white transition-transform duration-300 ease-out motion-reduce:transition-none ${
          isOpen ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full'
        }`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b-4 border-awm-red px-6">
          <h2 id="cart-title" className="text-2xl font-extrabold">{t('title')}</h2>
          <button
            ref={closeBtn}
            type="button"
            onClick={close}
            aria-label={t('close')}
            className="flex size-10 items-center justify-center hover:bg-awm-black hover:text-white focus-visible:outline-3 focus-visible:outline-awm-red"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 3l14 14M17 3L3 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-start justify-center gap-6 px-6">
            <p className="text-lg">{t('empty')}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/vehicles" onClick={close} className="bg-awm-black px-5 py-3 text-sm font-bold text-white hover:bg-awm-red">
                {t('browseVehicles')}
              </Link>
              <Link href="/parts" onClick={close} className="border-2 border-awm-black px-5 py-3 text-sm font-bold hover:bg-awm-black hover:text-white">
                {t('browseParts')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {flowsInCart.map((flow) => (
                <section key={flow} aria-labelledby={`flow-${flow}`}>
                  <h3 id={`flow-${flow}`} className="bg-awm-surface px-6 py-2 text-sm font-bold">
                    {t(`flows.${flow}`)}
                  </h3>
                  <ul>
                    {groups[flow].map((item) => (
                      <CartLine key={`${item.type}:${item.refId}`} item={item} money={money} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="shrink-0 border-t-2 border-awm-black px-6 py-5">
              {flowsInCart.length > 1 && <p className="mb-4 text-sm text-awm-black/70">{t('separateOrders')}</p>}
              <div className="mb-4 flex items-baseline justify-between">
                <span className="font-bold">{t(modeKey('dueNow'))}</span>
                <span className="text-2xl font-extrabold tabular-nums">{money(subtotal)}</span>
              </div>
              <Link
                href="/checkout"
                onClick={close}
                className="flex h-14 items-center justify-center bg-awm-red text-base font-bold text-white hover:bg-awm-black focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-awm-black"
              >
                {t(modeKey('checkout'))}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CartLine({ item, money }: { item: CartItem; money: (n: number) => string }) {
  const t = useTranslations('cart');
  const locale = useLocale() as 'ar' | 'en';
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.removeItem);
  const name = item.name[locale] || item.name.en;

  return (
    <li className="flex gap-4 border-b border-awm-black/10 px-6 py-4">
      <div className="relative size-20 shrink-0 bg-awm-surface">
        {item.image && <Image src={item.image} alt="" fill sizes="80px" className="object-cover" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-bold leading-snug">{name}</p>

        {item.type === 'spare_part' && <p className="text-xs text-awm-black/60">{item.sku}</p>}
        {item.type === 'vehicle_reservation' && item.vehiclePrice > 0 && (
          <p className="text-xs text-awm-black/60">{t('depositOf', { price: money(item.vehiclePrice) })}</p>
        )}
        {item.type === 'maintenance_invoice' && (
          <p className="text-xs text-awm-black/60">{t('invoice', { number: item.invoiceNumber })}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {item.type === 'spare_part' ? (
            <div className="flex items-center border-2 border-awm-black" role="group" aria-label={t('quantity')}>
              <button
                type="button"
                onClick={() => setQuantity(item.type, item.refId, item.quantity - 1)}
                aria-label={t('decrease')}
                className="size-8 font-bold hover:bg-awm-black hover:text-white"
              >−</button>
              <span className="w-8 text-center text-sm font-bold tabular-nums" aria-live="polite">{item.quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(item.type, item.refId, item.quantity + 1)}
                disabled={item.quantity >= item.maxQuantity}
                aria-label={t('increase')}
                className="size-8 font-bold hover:bg-awm-black hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-awm-black"
              >+</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => remove(item.type, item.refId)}
              className="text-sm font-medium underline underline-offset-4 hover:text-awm-red"
            >
              {t('remove')}
            </button>
          )}
          <span className="font-bold tabular-nums">{money(item.unitPrice * item.quantity)}</span>
        </div>
      </div>
    </li>
  );
}
