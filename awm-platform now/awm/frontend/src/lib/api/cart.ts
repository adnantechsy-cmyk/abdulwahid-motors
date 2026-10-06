'use client';

import { useCartStore, type CartItem } from '@/store/cartStore';
import type { ServerCart } from '@/types/api';
import { apiFetch } from './client';

/** Cart line type (store) -> morph alias (Laravel). */
const toMorph = (i: CartItem) =>
  i.type === 'spare_part' ? 'spare_part' : i.type === 'vehicle_reservation' ? 'vehicle' : 'maintenance_invoice';

/**
 * Push the local cart to Laravel and adopt the server's re-priced version.
 * Call before checkout and after login (merges the guest cart into the account).
 */
export async function syncCart(locale: string): Promise<ServerCart> {
  const { items, replaceItems } = useCartStore.getState();

  const server = await apiFetch<ServerCart>('/cart', {
    method: 'PUT',
    locale,
    body: JSON.stringify({ lines: items.map((i) => ({ type: toMorph(i), id: i.refId, quantity: i.quantity })) }),
  });

  replaceItems(
    server.items.map((s): CartItem => {
      const base = {
        refId: s.id,
        name: s.snapshot.name,
        image: (s.snapshot.image as string | null) ?? undefined,
        unitPrice: Number(s.unit_price),
        currency: server.currency,
      };
      if (s.flow === 'spare_part') {
        return { ...base, type: 'spare_part', sku: s.snapshot.sku ?? '', quantity: s.quantity, maxQuantity: Number(s.snapshot.max_quantity ?? s.quantity) };
      }
      if (s.flow === 'vehicle_reservation') {
        return { ...base, type: 'vehicle_reservation', vehiclePrice: Number(s.snapshot.vehicle_price ?? 0), quantity: 1 };
      }
      return { ...base, type: 'maintenance_invoice', invoiceNumber: String(s.snapshot.invoice_number ?? ''), quantity: 1 };
    }),
  );

  return server;
}
