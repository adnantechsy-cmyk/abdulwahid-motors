'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';

export type SpecRow = { key: string; value: string };

/** The spec names the website already shows with a translated label and unit. Any other name still works. */
export const KNOWN_SPEC_KEYS = ['range_km', 'battery_kwh', 'seats', 'power_hp', 'torque_nm', 'acceleration_0_100_s', 'top_speed_kmh', 'charging_dc_kw', 'cargo_l'] as const;

export const KEY_PATTERN = /^[a-z][a-z0-9_]{1,39}$/;

/** Turns the rows into the object Laravel stores, or the first problem found. Empty rows are ignored. */
export function specsFromRows(rows: SpecRow[]): { ok: true; specs: Record<string, string> } | { ok: false; error: 'name' | 'duplicate' | 'value'; key: string } {
  const specs: Record<string, string> = {};
  for (const { key, value } of rows) {
    const k = key.trim();
    const v = value.trim();
    if (!k && !v) continue;
    if (!KEY_PATTERN.test(k)) return { ok: false, error: 'name', key: k };
    if (!v) return { ok: false, error: 'value', key: k };
    if (k in specs) return { ok: false, error: 'duplicate', key: k };
    specs[k] = v;
  }
  return { ok: true, specs };
}

type Props = { rows: SpecRow[]; onChange: (rows: SpecRow[]) => void; error?: string | null };

/**
 * Name/value pairs for a car's specification table. Names end in their unit (range_km, power_hp...), which is how
 * the site knows to show "km" or "hp" next to the number, in the visitor's language.
 */
export function SpecsEditor({ rows, onChange, error }: Props) {
  const t = useTranslations('admin.vehicles.specs');
  const id = useId();
  const update = (i: number, patch: Partial<SpecRow>) => onChange(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-4">
      <p id={`${id}-hint`} className="text-sm text-awm-muted">{t('hint')}</p>
      <datalist id={`${id}-names`}>
        {KNOWN_SPEC_KEYS.map((k) => <option key={k} value={k}>{t(`names.${k}`)}</option>)}
      </datalist>

      {rows.length === 0 && <p className="border border-dashed border-awm-line p-4 text-sm text-awm-muted">{t('empty')}</p>}

      <ul className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <li key={i} className="grid grid-cols-1 gap-3 border border-awm-line bg-white p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-k${i}`} className="text-xs font-bold">{t('name')}</label>
              <input id={`${id}-k${i}`} list={`${id}-names`} value={row.key} onChange={(e) => update(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} maxLength={40} dir="ltr" autoComplete="off" aria-describedby={`${id}-hint`} className="h-11 w-full border border-awm-line bg-white px-3 font-mono text-sm" />
              {KNOWN_SPEC_KEYS.includes(row.key as (typeof KNOWN_SPEC_KEYS)[number]) && <span className="text-xs text-awm-muted">{t(`names.${row.key as (typeof KNOWN_SPEC_KEYS)[number]}`)}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-v${i}`} className="text-xs font-bold">{t('value')}</label>
              <input id={`${id}-v${i}`} value={row.value} onChange={(e) => update(i, { value: e.target.value })} maxLength={80} className="h-11 w-full border border-awm-line bg-white px-3 text-sm" />
            </div>
            <button type="button" onClick={() => onChange(rows.filter((_, n) => n !== i))} className={buttonClasses('outline', 'sm', 'h-11 px-3 text-xs')}>
              {t('remove')}<span className="sr-only"> {row.key || t('row', { n: i + 1 })}</span>
            </button>
          </li>
        ))}
      </ul>

      <div>
        <button type="button" onClick={() => onChange([...rows, { key: '', value: '' }])} disabled={rows.length >= 40} className={buttonClasses('outline', 'sm', 'h-10 px-4 text-sm')}>{t('add')}</button>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
    </div>
  );
}
