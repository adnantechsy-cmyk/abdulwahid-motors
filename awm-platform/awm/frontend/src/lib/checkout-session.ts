'use client';

import type { Currency } from '@/types/api';

/**
 * What the pay page needs to remember between pages: the orders just placed, the guest's phone (Laravel
 * uses it to prove a guest owns an order), and per-order payment state. sessionStorage, so it disappears
 * with the tab and is never shared across customers on a shared computer.
 */
export type PlacedOrder = { number: string; flow: string; currency: Currency; grand_total: string };
export type CheckoutSession = { phone: string; orders: PlacedOrder[] };

export type PaymentInstructions = { reference: string; amount: string; currency: Currency; details: string | null };
export type PaymentRecord = {
  payment_id: string;
  status: string;
  gateway: string;
  instructions?: PaymentInstructions;
  proofUploaded?: boolean;
};

const SESSION_KEY = 'awm-checkout';
const payKey = (order: string) => `awm-pay:${order}`;
const idemKey = (order: string, gateway: string) => `awm-idem:${order}:${gateway}`;

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // storage blocked or corrupted: the page falls back to asking again
  }
}

function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: nothing to persist */
  }
}

export const loadSession = () => read<CheckoutSession>(SESSION_KEY);
export const saveSession = (s: CheckoutSession) => write(SESSION_KEY, s);

export const loadPayment = (order: string) => read<PaymentRecord>(payKey(order));
export const savePayment = (order: string, p: PaymentRecord) => write(payKey(order), p);

/** Same key for the same order and method, so a retry after a dropped connection can't create a second payment. */
export function idempotencyKeyFor(order: string, gateway: string): string {
  const existing = read<string>(idemKey(order, gateway));
  if (existing) return existing;
  const key = crypto.randomUUID();
  write(idemKey(order, gateway), key);
  return key;
}
