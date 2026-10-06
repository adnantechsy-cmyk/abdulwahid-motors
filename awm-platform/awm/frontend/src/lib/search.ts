import 'server-only';
import { getPartList } from '@/lib/api/catalog';
import { apiGet } from '@/lib/api/server';
import type { Paginated, SparePartDto, VehicleDto } from '@/types/api';

export const MIN_QUERY = 2;
export const MAX_QUERY = 80;

/** Trim, drop control characters and cap the length: this string goes into a URL and onto the page. */
export function cleanQuery(raw: string | undefined): string {
  return (raw ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY);
}

/**
 * Normalise text so Arabic and Latin searches are forgiving: lower case, no diacritics or tatweel,
 * and the common letter variants (أ إ آ -> ا, ى -> ي, ة -> ه) folded together.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰٟـ̀-ͯ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every word of the query must appear somewhere in the haystack. */
function matches(haystack: string, query: string): boolean {
  const h = normalize(haystack);
  return normalize(query).split(' ').every((term) => h.includes(term));
}

export type SearchResult = {
  vehicles: VehicleDto[];
  parts: SparePartDto[];
  partsTotal: number;
  /** True if either lookup failed; the page says results may be incomplete. */
  incomplete: boolean;
};

const safe = async <T,>(call: Promise<T>): Promise<T | null> => {
  try {
    return await call;
  } catch {
    return null;
  }
};

/**
 * Searches the catalogue. Spare parts use Laravel's own `q` filter (name, SKU, OEM number).
 * The vehicles endpoint has no text filter, so the listed vehicles are fetched (at most three pages of 48)
 * and matched here against both language names, tagline, year and category.
 */
export async function searchCatalogue(locale: string, query: string): Promise<SearchResult> {
  const [parts, vehicles] = await Promise.all([
    safe(getPartList(locale, { q: query }, 24)),
    safe(allVehicles(locale)),
  ]);

  const matched = (vehicles ?? []).filter((v) =>
    matches([v.name, v.name_i18n.ar, v.name_i18n.en, v.tagline ?? '', String(v.model_year), v.category?.name ?? '', v.body_type ?? ''].join(' '), query),
  );

  return {
    vehicles: matched.slice(0, 12),
    parts: parts?.data ?? [],
    partsTotal: parts?.meta.total ?? 0,
    incomplete: parts === null || vehicles === null,
  };
}

async function allVehicles(locale: string): Promise<VehicleDto[]> {
  const first = await apiGet<Paginated<VehicleDto>>('/vehicles?per_page=48', { locale, tags: ['vehicles'] });
  if (!first) return [];
  const rest = await Promise.all(
    Array.from({ length: Math.min(first.meta.last_page, 3) - 1 }, (_, i) =>
      apiGet<Paginated<VehicleDto>>(`/vehicles?per_page=48&page=${i + 2}`, { locale, tags: ['vehicles'] }),
    ),
  );
  return [...first.data, ...rest.flatMap((p) => p?.data ?? [])];
}
