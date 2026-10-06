import 'server-only';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { apiGet } from '@/lib/api/server';
import type { SeoPayload } from '@/types/seo';
import { toMetadata } from './buildMetadata';
import { pageMetadata } from './pageMetadata';

/** Admin-editable SEO for a static page (keys: home | about | services | contact | vehicles | parts). */
export async function getRouteSeo(locale: string, key: string): Promise<SeoPayload | null> {
  try {
    return await apiGet<SeoPayload>(`/seo/routes/${key}`, { locale, tags: ['seo'] });
  } catch {
    return null; // the page still renders, with the built-in text below
  }
}

/**
 * generateMetadata helper: the admin's record from Laravel when there is one, otherwise the built-in
 * title and description from messages (`seo.<key>`), with full canonical, hreflang, Open Graph and Twitter data.
 */
export async function routeMetadata(locale: string, key: string): Promise<Metadata> {
  const seo = await getRouteSeo(locale, key);
  if (seo) return toMetadata(seo, locale);

  const t = await getTranslations({ locale, namespace: `seo.${key}` });
  return pageMetadata({ locale, path: key === 'home' ? '' : key, title: t('title'), description: t('description') });
}