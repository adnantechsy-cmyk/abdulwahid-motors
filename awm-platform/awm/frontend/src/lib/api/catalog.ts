import 'server-only';
import { apiGet } from './server';
import type { Paginated, SparePartDto, VehicleDto } from '@/types/api';

/**
 * Home-page reads. The page must still render when Laravel is down or empty,
 * so errors collapse to "no data" (sections show their empty state) instead of a 500.
 */
async function safe<T>(call: Promise<T | null>): Promise<T | null> {
  try {
    return await call;
  } catch {
    return null;
  }
}

export async function getFeaturedVehicles(locale: string, limit: number): Promise<VehicleDto[]> {
  const featured = await safe(apiGet<Paginated<VehicleDto>>(`/vehicles?featured=1&per_page=${limit}`, { locale, tags: ['vehicles'] }));
  if (featured && featured.data.length >= limit) return featured.data;

  // Not enough featured cars: top up with the newest listed ones, keeping featured first.
  const all = await safe(apiGet<Paginated<VehicleDto>>(`/vehicles?per_page=${limit}`, { locale, tags: ['vehicles'] }));
  const merged = [...(featured?.data ?? [])];
  for (const v of all?.data ?? []) {
    if (merged.length >= limit) break;
    if (!merged.some((m) => m.id === v.id)) merged.push(v);
  }
  return merged;
}

export async function getParts(locale: string, limit: number): Promise<SparePartDto[]> {
  const parts = await safe(apiGet<Paginated<SparePartDto>>(`/parts?per_page=${limit}`, { locale, tags: ['parts'] }));
  return parts?.data ?? [];
}
