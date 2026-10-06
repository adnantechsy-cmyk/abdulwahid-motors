import { formatNumber } from './format';

/** Spec keys end in their unit (range_km, battery_kwh, ...). The unit label comes from messages. */
const UNIT_SUFFIXES = [
  ['_kmh', 'kmh'],
  ['_kwh', 'kwh'],
  ['_km', 'km'],
  ['_kw', 'kw'],
  ['_hp', 'hp'],
  ['_nm', 'nm'],
  ['_s', 's'],
  ['_l', 'l'],
] as const;

export type UnitKey = (typeof UNIT_SUFFIXES)[number][1];

export function unitFor(key: string): UnitKey | null {
  return UNIT_SUFFIXES.find(([suffix]) => key.endsWith(suffix))?.[1] ?? null;
}

/** "acceleration_0_100_s" -> "Acceleration 0 100 s": the fallback when a key has no translation. */
export function humanizeKey(key: string): string {
  const spaced = key.replace(/_/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Numbers are localised; text values pass through. `unit` is the already-translated unit label. */
export function formatSpecValue(value: string | number, locale: string, unit?: string): string {
  if (typeof value === 'number' || (value !== '' && Number.isFinite(Number(value)))) {
    const n = formatNumber(Number(value), locale);
    return unit ? `${n} ${unit}` : n;
  }
  return String(value);
}
