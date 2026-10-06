'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** The three checkout flows. Mirrors cart_items.flow in the database. */
export type CartItemType = 'spare_part' | 'vehicle_reservation' | 'maintenance_invoice';

export type LocalizedText = { ar: string; en: string };

interface BaseItem {
  /** Id of the underlying record (spare part id, vehicle id, invoice id). */
  refId: number;
  name: LocalizedText;
  image?: string;
  /** Price snapshot. The server re-prices at checkout; this is display-only. */
  unitPrice: number;
  currency: 'USD' | 'SYP';
}

export interface SparePartItem extends BaseItem {
  type: 'spare_part';
  sku: string;
  quantity: number;
  /** Stock at the time of adding; caps the quantity stepper. */
  maxQuantity: number;
}

export interface VehicleReservationItem extends BaseItem {
  type: 'vehicle_reservation';
  /** unitPrice is the DEPOSIT. Full price is shown for context only. */
  vehiclePrice: number;
  quantity: 1;
}

export interface MaintenanceInvoiceItem extends BaseItem {
  type: 'maintenance_invoice';
  invoiceNumber: string;
  /** unitPrice is the outstanding balance. */
  quantity: 1;
}

export type CartItem = SparePartItem | VehicleReservationItem | MaintenanceInvoiceItem;

/** What callers pass to addItem: quantity is optional (defaults to 1). */
export type NewCartItem =
  | (Omit<SparePartItem, 'quantity'> & { quantity?: number })
  | Omit<VehicleReservationItem, 'quantity'>
  | Omit<MaintenanceInvoiceItem, 'quantity'>;

export type AddResult = 'added' | 'updated' | 'already_in_cart' | 'currency_mismatch';

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  addItem: (item: NewCartItem) => AddResult;
  removeItem: (type: CartItemType, refId: number) => void;
  setQuantity: (type: CartItemType, refId: number, quantity: number) => void;
  clear: () => void;
  clearFlow: (type: CartItemType) => void;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  /** Replace local items with the server's authoritative cart (after login / re-pricing). */
  replaceItems: (items: CartItem[]) => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const itemKey = (type: CartItemType, refId: number) => `${type}:${refId}`;

const matches = (i: CartItem, type: CartItemType, refId: number) =>
  i.type === type && i.refId === refId;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (incoming) => {
        const { items } = get();

        // One currency per cart: mixing USD parts with SYP invoices breaks totals and gateway selection.
        if (items.length > 0 && items[0].currency !== incoming.currency) {
          return 'currency_mismatch';
        }

        const existing = items.find((i) => matches(i, incoming.type, incoming.refId));

        // Reservations and invoices are unique, single-quantity lines.
        if (existing && incoming.type !== 'spare_part') {
          set({ isOpen: true });
          return 'already_in_cart';
        }

        if (existing && existing.type === 'spare_part' && incoming.type === 'spare_part') {
          const next = clamp(existing.quantity + (incoming.quantity ?? 1), 1, incoming.maxQuantity);
          set({
            items: items.map((i) =>
              i.type === 'spare_part' && i.refId === incoming.refId
                ? { ...i, quantity: next, maxQuantity: incoming.maxQuantity, unitPrice: incoming.unitPrice }
                : i,
            ),
            isOpen: true,
          });
          return 'updated';
        }

        const newItem: CartItem =
          incoming.type === 'spare_part'
            ? { ...incoming, quantity: clamp(incoming.quantity ?? 1, 1, incoming.maxQuantity) }
            : ({ ...incoming, quantity: 1 } as CartItem);

        set({ items: [...items, newItem], isOpen: true });
        return 'added';
      },

      removeItem: (type, refId) =>
        set((s) => ({ items: s.items.filter((i) => !matches(i, type, refId)) })),

      setQuantity: (type, refId, quantity) =>
        set((s) => ({
          items: s.items.flatMap((i) => {
            if (!matches(i, type, refId)) return [i];
            if (i.type !== 'spare_part') return [i]; // quantity is fixed for the other flows
            if (quantity <= 0) return []; // stepper down to 0 removes the line
            return [{ ...i, quantity: clamp(quantity, 1, i.maxQuantity) }];
          }),
        })),

      clear: () => set({ items: [] }),
      clearFlow: (type) => set((s) => ({ items: s.items.filter((i) => i.type !== type) })),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      replaceItems: (items) => set({ items }),
    }),
    {
      name: 'awm-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist the lines only; the drawer should always start closed.
      partialize: (state) => ({ items: state.items }),
      // Rehydrate manually on the client to avoid SSR/CSR markup mismatches (see CartHydrator).
      skipHydration: true,
      migrate: (persisted) => persisted as Pick<CartState, 'items'>,
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Selectors (use these to avoid re-rendering on unrelated changes)    */
/* ------------------------------------------------------------------ */

export const selectItems = (s: CartState) => s.items;
export const selectCount = (s: CartState) => s.items.reduce((n, i) => n + i.quantity, 0);
export const selectSubtotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

/** Group lines by checkout flow: each group becomes its own order at checkout. */
export const selectByFlow = (s: CartState): Record<CartItemType, CartItem[]> => ({
  spare_part: s.items.filter((i) => i.type === 'spare_part'),
  vehicle_reservation: s.items.filter((i) => i.type === 'vehicle_reservation'),
  maintenance_invoice: s.items.filter((i) => i.type === 'maintenance_invoice'),
});
