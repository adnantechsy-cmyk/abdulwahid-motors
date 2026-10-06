type Raw = Record<string, string | string[] | undefined>;

/** First value of a query param, trimmed. Arrays (?a=1&a=2) collapse to the first entry. */
export function param(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const first = Array.isArray(v) ? v[0] : v;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

/** A positive integer page number, defaulting to 1 for anything else. */
export function pageParam(raw: Raw): number {
  const n = Number(param(raw, 'page'));
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}

/** Only values from the allowed list pass through; anything else is dropped. */
export function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((a) => a === value);
}

/** Query object for next-intl <Link href={{ pathname, query }}>: drops empty values and page 1. */
export function toQuery(values: Record<string, string | number | boolean | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === '' || v === false) continue;
    if (k === 'page' && Number(v) <= 1) continue;
    out[k] = v === true ? '1' : String(v);
  }
  return out;
}
