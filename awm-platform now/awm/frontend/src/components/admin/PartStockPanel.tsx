'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button, Field, Input, Select, cx } from '@/components/ui/primitives';
import { ApiError, apiFetch } from '@/lib/api/client';

/** Stock in / out. Every change is recorded as a movement; stock is never typed in directly. */
export function PartStockPanel({ partId }: { partId: number }) {
  const t = useTranslations('admin.parts.stock');
  const locale = useLocale();
  const router = useRouter();
  const [type, setType] = useState<'purchase' | 'return' | 'adjustment'>('purchase');
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const qty = Math.abs(Number(f.get('quantity')));
    const signed = type === 'adjustment' && direction === 'out' ? -qty : qty;
    setSaving(true);
    setError(null);
    setDone(null);
    try {
      await apiFetch(`/admin/parts/${partId}/stock`, { method: 'POST', locale, body: JSON.stringify({ type, quantity: signed, note: (f.get('note') as string) || null }) });
      setDone(t('saved'));
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.errors ?? {})[0]?.[0] ?? err.message) : t('error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 self-start bg-awm-surface p-5">
      <h3 className="marker-square font-extrabold">{t('title')}</h3>
      <Field label={t('type')}>
        <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="purchase">{t('purchase')}</option>
          <option value="return">{t('return')}</option>
          <option value="adjustment">{t('adjustment')}</option>
        </Select>
      </Field>
      {type === 'adjustment' && (
        <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label={t('direction')}>
          {(['in', 'out'] as const).map((d) => (
            <button key={d} type="button" role="radio" aria-checked={direction === d} onClick={() => setDirection(d)}
              className={cx('h-10 border text-sm font-bold', direction === d ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line bg-white')}>
              {t(d === 'in' ? 'add' : 'remove')}
            </button>
          ))}
        </div>
      )}
      <Field label={t('quantity')}><Input name="quantity" type="number" min={1} required inputMode="numeric" className="font-mono" /></Field>
      <Field label={type === 'adjustment' ? t('reasonRequired') : t('note')}>
        <Input name="note" required={type === 'adjustment'} maxLength={255} placeholder={type === 'purchase' ? t('notePlaceholder') : ''} />
      </Field>
      {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
      {done && <p role="status" className="text-sm font-medium text-awm-ok">{done}</p>}
      <Button type="submit" disabled={saving}>{saving ? t('saving') : t('submit')}</Button>
    </form>
  );
}
