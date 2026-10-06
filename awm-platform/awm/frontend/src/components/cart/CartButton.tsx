'use client';

import { useTranslations } from 'next-intl';
import { selectCount, useCartStore } from '@/store/cartStore';

/** Header trigger for the slide-over cart. */
export function CartButton() {
  const t = useTranslations('cart');
  const count = useCartStore(selectCount);
  const open = useCartStore((s) => s.openCart);

  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      className="relative flex h-10 items-center gap-2 border-2 border-awm-black px-3 text-sm font-bold hover:bg-awm-black hover:text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-awm-red"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M3 4h2l2.4 11h11L21 7H6.2" strokeLinecap="square" />
        <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
      </svg>
      <span className="max-sm:sr-only">{t('title')}</span>
      {count > 0 && (
        <>
          {/* The badge is visual; the spoken name is "Cart" plus the count in words. */}
          <span aria-hidden="true" className="min-w-6 bg-awm-red px-1.5 text-center text-xs leading-6 text-white tabular-nums">{count}</span>
          <span className="sr-only">{t('count', { count })}</span>
        </>
      )}
    </button>
  );
}
