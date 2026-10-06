import 'server-only';
import { apiGet } from './server';
import type { CategoryDto, Paginated, SparePartDto, VehicleDto } from '@/types/api';

/**
 * Catalogue reads. Pages must still render when Laravel is down or empty, so errors
 * collapse to null ("couldn't load") instead of a 500. An empty list is a real result.
 */
async function safe<T>(call: Promise<T | null>): Promise<T | null> {
  try {
    return await call;
  } catch {
    return null;
  }
}

const qs = (params: Record<string, string | number | boolean | undefined>): string => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && v !== false) sp.set(k, String(v === true ? 1 : v));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

/* ---------------- Home ---------------- */

export async function getFeaturedVehicles(locale: string, limit: number): Promise<VehicleDto[]> {
  const featured = await safe(apiGet<Paginated<VehicleDto>>(`/vehicles${qs({ featured: true, per_page: limit })}`, { locale, tags: ['vehicles'] }));
  if (featured && featured.data.length >= limit) return featured.data;

  // Not enough featured cars: top up with the newest listed ones, keeping featured first.
  const all = await safe(apiGet<Paginated<VehicleDto>>(`/vehicles${qs({ per_page: limit })}`, { locale, tags: ['vehicles'] }));
  const merged = [...(featured?.data ?? [])];
  for (const v of all?.data ?? []) {
    if (merged.length >= limit) break;
    if (!merged.some((m) => m.id === v.id)) merged.push(v);
  }
  return merged;
}

export async function getParts(locale: string, limit: number): Promise<SparePartDto[]> {
  const parts = await safe(apiGet<Paginated<SparePartDto>>(`/parts${qs({ per_page: limit })}`, { locale, tags: ['parts'] }));
  return parts?.data ?? [];
}

/* ---------------- List pages ---------------- */

export const POWERTRAINS = ['bev', 'phev', 'hev', 'ice'] as const;
export const VEHICLE_STATUSES = ['available', 'incoming', 'reserved', 'sold'] as const;

export type VehicleQuery = { powertrain?: string; status?: string; category?: string; page?: number };
export type PartQuery = { q?: string; model?: string; category?: string; in_stock?: boolean; page?: number };

export const getVehicleList = (locale: string, q: VehicleQuery, perPage = 12) =>
  safe(apiGet<Paginated<VehicleDto>>(`/vehicles${qs({ ...q, per_page: perPage })}`, { locale, tags: ['vehicles'] }));

export const getPartList = (locale: string, q: PartQuery, perPage = 24) =>
  safe(apiGet<Paginated<SparePartDto>>(`/parts${qs({ ...q, per_page: perPage })}`, { locale, tags: ['parts'] }));

export async function getCategories(locale: string, type: 'vehicle' | 'spare_part'): Promise<CategoryDto[]> {
  return (await safe(apiGet<CategoryDto[]>(`/categories?type=${type}`, { locale, tags: ['categories'] }))) ?? [];
}
