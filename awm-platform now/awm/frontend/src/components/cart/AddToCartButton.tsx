'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { itemKey, useCartStore, type NewCartItem } from '@/store/cartStore';

type Props = {
  item: NewCartItem;
  label: string;
  inCartLabel: string;
  disabled?: boolean;
  className?: string;
};

export function AddToCartButton({ item, label, inCartLabel, disabled, className = '' }: Props) {
  const t = useTranslations('cart');
  const addItem = useCartStore((s) => s.addItem);
  const inCart = useCartStore((s) => s.items.some((i) => itemKey(i.type, i.refId) === itemKey(item.type, item.refId)));
  const [error, setError] = useState<string | null>(null);

  // Parts can be added again (quantity +1); reservations and invoices are single lines.
  const locked = inCart && item.type !== 'spare_part';

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled || locked}
        onClick={() => {
          const result = addItem(item);
          setError(result === 'currency_mismatch' ? t('currencyMismatch') : null);
        }}
        className={`h-14 bg-awm-red px-8 text-base font-bold text-white transition-colors hover:bg-awm-black focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-awm-black disabled:cursor-not-allowed disabled:bg-awm-black/30 ${className}`}
      >
        {locked ? inCartLabel : label}
      </button>
      {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
    </div>
  );
}
