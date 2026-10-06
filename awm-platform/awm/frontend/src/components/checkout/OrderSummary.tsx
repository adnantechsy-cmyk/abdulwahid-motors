'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { formatMoney } from '@/lib/format';
import { selectSubtotal, useCartStore, type CartItem, type CartItemType } from '@/store/cartStore';

const FLOW_ORDER: CartItemType[] = ['vehicle_reservation', 'maintenance_invoice', 'spare_part'];

/** Read-only cart summary beside the checkout form. Totals are re-priced by Laravel when the order is placed. */
export function OrderSummary() {
  const t = useTranslations('cart');
  const tc = useTranslations('checkout');
  const locale = useLocale() as 'ar' | 'en';
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectSubtotal);
  const currency = items[0]?.currency ?? 'USD';
  const money = (n: number) => formatMoney(n, currency, locale, currency === 'SYP' ? 0 : 2);

  const groups = FLOW_ORDER.map((flow) => ({ flow, lines: items.filter((i) => i.type === flow) })).filter((g) => g.lines.length > 0);

  return (
    <aside aria-labelledby="summary-title" className="border border-awm-line bg-white lg:sticky lg:top-6">
      <h2 id="summary-title" className="flex items-center gap-3 border-b border-awm-line px-5 py-4 text-lg font-extrabold">
        <span aria-hidden="true" className="h-5 w-1 bg-awm-red" />
        {tc('summary.title')}
      </h2>

      <div className="flex flex-col gap-5 p-5">
        {groups.map(({ flow, lines }) => (
          <section key={flow} aria-label={t(`flows.${flow}`)}>
            <h3 className="mb-2 bg-awm-surface px-3 py-1.5 text-xs font-bold">{t(`flows.${flow}`)}</h3>
            <ul className="flex flex-col divide-y divide-awm-line">
              {lines.map((item) => <SummaryLine key={`${item.type}:${item.refId}`} item={item} money={money} locale={locale} />)}
            </ul>
          </section>
        ))}

        {groups.length > 1 && <p className="text-sm text-awm-muted">{t('separateOrders')}</p>}

        <dl className="flex items-baseline justify-between border-t-2 border-awm-black pt-4">
          <dt className="font-bold">{t('dueNow')}</dt>
          <dd className="font-mono text-2xl font-extrabold tabular-nums">{money(subtotal)}</dd>
        </dl>
      </div>
    </aside>
  );
}

function SummaryLine({ item, money, locale }: { item: CartItem; money: (n: number) => string; locale: 'ar' | 'en' }) {
  const t = useTranslations('cart');
  const name = item.name[locale] || item.name.en;

  return (
    <li className="flex gap-3 py-3">
      <div className="relative size-14 shrink-0 bg-awm-surface">
        {item.image && <Image src={item.image} alt="" fill sizes="56px" className="object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-snug">{name}</p>
        {item.type === 'spare_part' && <p className="text-xs text-awm-muted"><span dir="ltr">{item.sku}</span> × {item.quantity}</p>}
        {item.type === 'vehicle_reservation' && item.vehiclePrice > 0 && <p className="text-xs text-awm-muted">{t('depositOf', { price: money(item.vehiclePrice) })}</p>}
        {item.type === 'maintenance_invoice' && <p className="text-xs text-awm-muted">{t('invoice', { number: item.invoiceNumber })}</p>}
      </div>
      <p className="font-mono text-sm font-bold tabular-nums">{money(item.unitPrice * item.quantity)}</p>
    </li>
  );
}
