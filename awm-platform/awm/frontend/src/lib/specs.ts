import { formatNumber } from './format';

/** Spec keys end in their unit (range_km, battery_kwh, ...). The unit label comes from messages. Longest suffix first. */
const UNIT_SUFFIXES = [
  ['_kwh_100km', 'kwh100'],
  ['_l100', 'l100'],
  ['_kmh', 'kmh'],
  ['_kwh', 'kwh'],
  ['_km', 'km'],
  ['_kw', 'kw'],
  ['_hp', 'hp'],
  ['_nm', 'nm'],
  ['_mm', 'mm'],
  ['_kg', 'kg'],
  ['_min', 'min'],
  ['_in', 'in'],
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

/**
 * The page's spec table is grouped. Keys not listed here fall into "other", so a spec added in the admin with a
 * new name still shows up. Order inside each group is the order shown.
 */
export const SPEC_SECTIONS = {
  dimensions: ['length_mm', 'width_mm', 'height_mm', 'wheelbase_mm', 'ground_clearance_mm', 'curb_weight_kg', 'cargo_l', 'fuel_tank_l', 'seats'],
  performance: ['hybrid_system', 'drive', 'transmission', 'engine_displacement_l', 'engine_aspiration', 'engine_power_hp', 'engine_torque_nm', 'motor_power_hp', 'motor_torque_nm', 'power_hp', 'torque_nm', 'acceleration_0_50_s', 'acceleration_0_100_s', 'top_speed_kmh'],
  battery: ['battery_type', 'battery_kwh', 'range_km', 'range_ev_km', 'range_total_km', 'consumption_kwh_100km', 'fuel_consumption_l100', 'charging_dc_kw', 'dc_charge_time_min', 'charging_ac_kw', 'v2l_kw'],
  wheels: ['wheel_size_in'],
} as const;

export type SpecSection = keyof typeof SPEC_SECTIONS | 'other';

export const SPEC_SECTION_ORDER: SpecSection[] = ['dimensions', 'performance', 'battery', 'wheels', 'other'];

/** Splits a specs object into the grouped sections, dropping empty values. */
export function groupSpecs(specs: Record<string, string | number> | null | undefined): { section: SpecSection; entries: [string, string | number][] }[] {
  const all = Object.entries(specs ?? {}).filter(([, v]) => v !== '' && v !== null && v !== undefined);
  const known = new Set<string>(Object.values(SPEC_SECTIONS).flat());

  return SPEC_SECTION_ORDER.map((section) => {
    const entries: [string, string | number][] =
      section === 'other'
        ? all.filter(([k]) => !known.has(k))
        : (SPEC_SECTIONS[section] as readonly string[]).flatMap((k) => all.filter(([key]) => key === k));
    return { section, entries };
  }).filter((g) => g.entries.length > 0);
}

/** One number, or several joined by " - " (a range between versions) or " / " (several values), optionally ending in "+". */
const NUMBERISH = /^\d[\d.,]*(?:\s(?:-|\/)\s\d[\d.,]*)*\+?$/;

/**
 * Numbers are localised and get their unit once at the end: "30.08 - 38.88" becomes "30.08 - 38.88 kWh",
 * "2000+" becomes "2,000+ km". Anything else (text) passes through unchanged. `unit` is the already-translated label.
 */
export function formatSpecValue(value: string | number, locale: string, unit?: string): string {
  const text = String(value).trim();

  if (typeof value === 'number' || (text !== '' && Number.isFinite(Number(text)))) {
    const n = formatNumber(Number(text), locale);
    return unit ? `${n} ${unit}` : n;
  }

  if (NUMBERISH.test(text)) {
    const plus = text.endsWith('+') ? '+' : '';
    const body = plus ? text.slice(0, -1) : text;
    const formatted = body.replace(/\d[\d.,]*/g, (num) => formatNumber(Number(num.replace(/,/g, '')), locale));
    return `${formatted}${plus}${unit ? ` ${unit}` : ''}`;
  }

  return text;
}