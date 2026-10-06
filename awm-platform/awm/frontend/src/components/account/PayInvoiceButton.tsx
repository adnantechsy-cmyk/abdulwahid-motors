import { getTranslations } from 'next-intl/server';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import type { InvoiceRef } from '@/types/account';

/** Adds an unpaid service invoice to the cart (flow: maintenance_invoice, price = outstanding balance). */
export async function PayInvoiceButton({ invoice }: { invoice: Pick<InvoiceRef, 'id' | 'number' | 'balance' | 'currency'> }) {
  const t = await getTranslations('account.invoices');
  const tc = await getTranslations('common');
  const nameFor = async (locale: 'ar' | 'en') => (await getTranslations({ locale, namespace: 'account.invoices' }))('cartName', { number: invoice.number });

  return (
    <AddToCartButton
      label={t('pay')}
      inCartLabel={tc('inCart')}
      className="h-9 px-3 text-xs"
      item={{
        type: 'maintenance_invoice',
        refId: invoice.id,
        invoiceNumber: invoice.number,
        name: { ar: await nameFor('ar'), en: await nameFor('en') },
        unitPrice: Number(invoice.balance),
        currency: invoice.currency,
      }}
    />
  );
}
