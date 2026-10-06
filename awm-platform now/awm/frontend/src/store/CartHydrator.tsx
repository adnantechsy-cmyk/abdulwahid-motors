'use client';

import { useEffect } from 'react';
import { useCartStore } from './cartStore';

/** Mount once in the root layout. Restores the cart from localStorage after first paint. */
export function CartHydrator() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();

    // Keep multiple tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'awm-cart') void useCartStore.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return null;
}
