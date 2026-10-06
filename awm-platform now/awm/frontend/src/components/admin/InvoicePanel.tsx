'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Button, Field, Input, Select } from '@/components/ui/primitives';
import { ApiError, apiFetch } from '@/lib/api/client';
import { formatDate, formatMoney } from '@/lib/format';
import type { InvoiceFull } from '@/types/admin';
import type { ComponentProps } from 'react';

/** Invoice review + counter collection (cash, transfer, mobile money, card terminal). */
export function InvoicePanel({ invoice: i, closeHref }: { invoice: InvoiceFull; closeHref: ComponentProps<typeof Link>['href'] }) {
  const t = useTranslations('admin.billing');
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const money = (a: string) => formatMoney(a, i.currency, locale, 2);
  const open = i.status === 'unpaid' || i.status === 'partially_paid';

  async function collect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/admin/invoices/${i.id}/payments`, {
        method: 'POST', locale,
        body: JSON.stringify({ amount: f.get('amount'), method: f.get('method'), reference: f.get('reference') || null, note: f.get('note') || null }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.errors ?? {})[0]?.[0] ?? err.message) : t('error'));
    } finally {
      setSaving(false);
    }
  }

  async function voidInvoice() {
    if (!window.confirm(t('voidConfirm', { number: i.number }))) return;
    try {
      await apiFetch(`/admin/invoices/${i.id}/void`, { method: 'POST', locale });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('error'));
    }
  }

  return (
    <aside className="flex flex-col gap-5 border border-awm-line p-5 xl:sticky xl:top-20 xl:self-start" aria-label={t('panelTitle')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="marker-square text-xs font-bold text-awm-muted">{t('panelTitle')}</p>
          <h2 className="font-mono text-xl font-bold">{i.number}</h2>
          <p className="text-sm">{i.customer?.name}{i.job_card && <span className="text-awm-muted"> · {i.job_card}</span>}</p>
        </div>
        <Link href={closeHref} aria-label={t('closePanel')} className="flex size-9 items-center justify-center hover:bg-awm-surface"><Icon name="close" size={16} /></Link>
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between"><dt>{t('issued')}</dt><dd className="font-mono">{formatDate(i.issued_at, locale)}</dd></div>
        <div className="flex justify-between"><dt>{t('due')}</dt><dd className={i.is_overdue ? 'font-mono font-bold text-awm-red' : 'font-mono'}>{formatDate(i.due_at, locale)}</dd></div>
      </dl>

      <div className="flex flex-col gap-2 border-y border-awm-line py-4 text-sm">
        <p className="text-xs font-bold text-awm-muted">{t('lines')}</p>
        {(i.lines ?? []).map((l, idx) => (
          <div key={idx} className="flex justify-between gap-3">
            <span>{l.name} <span className="font-mono text-xs text-awm-muted">×{l.quantity}</span></span>
            <span className="font-mono">{money((Number(l.unit_price) * l.quantity).toFixed(2))}</span>
          </div>
        ))}
        <div className="flex justify-between gap-3"><span>{t('labor')}</span><span className="font-mono">{money(i.labor_total)}</span></div>
        <div className="mt-2 flex items-baseline justify-between border-t border-awm-line pt-3">
          <span className="font-extrabold">{t('total')}</span>
          <span className="font-mono text-2xl font-bold text-awm-red">{money(i.total)}</span>
        </div>
        <div className="flex justify-between text-awm-muted"><span>{t('paid')}</span><span className="font-mono">{money(i.paid_amount)}</span></div>
        <div className="flex justify-between font-bold"><span>{t('balance')}</span><span className="font-mono">{money(i.balance)}</span></div>
      </div>

      {i.payments.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-awm-muted">{t('payments')}</p>
          <ul className="divide-y divide-awm-line border border-awm-line text-sm">
            {i.payments.map((p, idx) => (
              <li key={idx} className="flex flex-col gap-0.5 p-3">
                <span className="flex justify-between"><b>{t(`method.${p.method}`)}</b><span className="font-mono font-bold">{money(p.amount)}</span></span>
                <span className="text-xs text-awm-muted">{formatDate(p.received_at, locale, true)}{p.received_by && ` · ${p.received_by}`}{p.reference && <> · <span className="font-mono">{p.reference}</span></>}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && (
        <form onSubmit={collect} className="flex flex-col gap-3 bg-awm-surface p-4">
          <h3 className="font-extrabold">{t('collect')}</h3>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('amount')}><Input name="amount" inputMode="decimal" required defaultValue={i.balance} className="font-mono" /></Field>
            <Field label={t('methodLabel')}>
              <Select name="method" defaultValue="cash">
                {(['cash', 'bank_transfer', 'mobile_money', 'card_terminal'] as const).map((m) => <option key={m} value={m}>{t(`method.${m}`)}</option>)}
              </Select>
            </Field>
          </div>
          <Field label={t('reference')}><Input name="reference" dir="ltr" className="font-mono" /></Field>
          <Field label={t('note')}><Input name="note" /></Field>
          {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
          <Button type="submit" disabled={saving} icon="check">{saving ? t('saving') : t('recordPayment')}</Button>
        </form>
      )}

      {i.status === 'unpaid' && Number(i.paid_amount) === 0 && (
        <Button variant="danger" size="sm" onClick={voidInvoice}>{t('void')}</Button>
      )}
    </aside>
  );
}
