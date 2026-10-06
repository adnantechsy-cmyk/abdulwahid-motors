import type { CartItem } from '@/store/cartStore';

export interface PlacedOrder { number: string; flow: 'spare_part' | 'vehicle_reservation' | 'maintenance_invoice'; currency: string; grand_total: string }
export interface PaymentOutcome {
  order: string;
  payment_id: string;
  status: string;
  method: string;
  instructions?: { reference: string; amount: string; currency: string; details: string | null };
}
/** Saved to sessionStorage for the confirmation page (guests can't fetch orders back). */
export interface CheckoutRecord {
  placedAt: string;
  customer: { name: string; phone: string; email?: string };
  branch: string | null;
  delivery: 'pickup' | 'delivery';
  orders: PlacedOrder[];
  payments: PaymentOutcome[];
  items: CartItem[];
}
export const CHECKOUT_RECORD_KEY = 'awm-last-checkout';
