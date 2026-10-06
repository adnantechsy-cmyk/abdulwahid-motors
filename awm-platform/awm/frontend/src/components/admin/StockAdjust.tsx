'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { useAdminRun } from './useAdminRun';

const TYPES = ['purchase', 'return', 'adjustment'] as const;

/**
 * Add or correct stock. Receiving goods and customer returns only add; a correction may add or remove and must
 * say why. Every change is written to the movement log by Laravel, so nothing here edits the total directly.
 */
export function StockAdjust({ partId }: { partId: number }) {
  const t = useTranslations('admin.parts.stock');
  const ta = useTranslations('admin');
  const { run, pending, error, setError } = useAdminRun();
  const id = useId();
  const [type, setType] = useState<(typeof TYPES)[number]>('purchase');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setDone(false);
    const n = Math.trunc(Number(qty));
    if (!Number.isFinite(n) || n === 0 || (type !== 'adjustment' && n < 0)) return setInvalid(type === 'adjustment' ? t('invalidAdjust') : t('invalidAdd'));
    if (type === 'adjustment' && !note.trim()) return setInvalid(t('noteRequired'));
    setInvalid(null);

    const r = await run('POST', `parts/${partId}/stock`, { type, change: n, note: note.trim() || undefined }, { insufficient_stock: t('insufficient'), bad_direction: t('invalidAdd') });
    if (r.ok) { setQty(''); setNote(''); setDone(true); }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-type`} className="text-sm font-bold">{t('type')}</label>
        <select id={`${id}-type`} value={type} onChange={(e) => { setType(e.target.value as typeof type); setInvalid(null); setError(null); }} className="h-12 border border-awm-line bg-white px-3">
          {TYPES.map((x) => <option key={x} value={x}>{t(`types.${x}`)}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-qty`} className="text-sm font-bold">{t('quantity')}</label>
        <input id={`${id}-qty`} type="number" inputMode="numeric" step="1" value={qty} onChange={(e) => setQty(e.target.value)} dir="ltr" aria-describedby={`${id}-qty-hint`} className="h-12 border border-awm-line bg-white px-4" />
        <p id={`${id}-qty-hint`} className="text-xs text-awm-muted">{type === 'adjustment' ? t('adjustHint') : t('addHint')}</p>
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <label htmlFor={`${id}-note`} className="flex justify-between text-sm font-bold">
          <span>{t('note')}</span>
          {type !== 'adjustment' && <span className="text-xs font-medium text-awm-muted">{ta('optional')}</span>}
        </label>
        <input id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className="h-12 border border-awm-line bg-white px-4" />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={pending} className={buttonClasses('dark', 'md')}>{pending ? ta('working') : t('submit')}</button>
        {done && <p role="status" className="text-sm font-bold">{t('done')}</p>}
        {(invalid || error) && <p role="alert" className="text-sm font-medium text-awm-red">{invalid ?? error}</p>}
      </div>
    </form>
  );
}
