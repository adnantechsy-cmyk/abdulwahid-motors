import 'server-only';
import type { Metadata } from 'next';
import { apiGet } from '@/lib/api/server';
import type { SeoPayload } from '@/types/seo';
import { toMetadata } from './buildMetadata';

/** Admin-editable SEO for a static page (keys: home | about | services | contact | vehicles | parts). */
export async function getRouteSeo(locale: string, key: string): Promise<SeoPayload | null> {
  try {
    return await apiGet<SeoPayload>(`/seo/routes/${key}`, { locale, tags: ['seo'] });
  } catch {
    return null; // the page still renders, with the fallback title below
  }
}

/** generateMetadata helper: Laravel's meta when available, otherwise the page's own title and description. */
export async function routeMetadata(locale: string, key: string, fallback: { title: string; description: string }): Promise<Metadata> {
  const seo = await getRouteSeo(locale, key);
  return seo ? toMetadata(seo) : fallback;
}
