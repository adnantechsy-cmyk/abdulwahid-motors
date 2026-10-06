/**
 * How a checkout ends.
 *
 * - `request` (default): the website only captures the order or reservation. The sales team contacts the customer,
 *   agrees the details and takes the payment themselves, then records it in the admin (Orders > Record payment).
 * - `online`: after the order the customer is sent to the payment page (bank transfer receipt upload, card later).
 *
 * Set NEXT_PUBLIC_CHECKOUT_MODE=online at build time to switch. Both flows keep working; nothing is deleted.
 */
export const CHECKOUT_MODE: 'request' | 'online' = process.env.NEXT_PUBLIC_CHECKOUT_MODE === 'online' ? 'online' : 'request';

/** Where to go right after the order is placed. */
export const afterCheckoutPath = (orderNumber: string) => (CHECKOUT_MODE === 'online' ? `/checkout/pay/${orderNumber}` : `/checkout/received/${orderNumber}`);

/** Message-key suffix for texts that differ between the two modes: `submit` vs `submitRequest`. */
export const modeKey = (key: string) => (CHECKOUT_MODE === 'online' ? key : `${key}Request`);
