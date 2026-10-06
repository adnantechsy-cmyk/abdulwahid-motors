import type { MetadataRoute } from 'next';
import { apiGet } from '@/lib/api/server';
import { absoluteUrl, LOCALES } from '@/lib/seo/site';
import type { SitemapResponse } from '@/types/seo';

type Row = SitemapResponse['urls'][number];

/** Public pages that exist in the frontend but not in Laravel's route list. */
const EXTRA_PAGES: Row[] = [{ path: 'service-booking', lastmod: null, changefreq: 'monthly', priority: 0.7 }];

/** /sitemap.xml: rebuilt from Laravel; purged by the admin SEO module via /api/revalidate. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await apiGet<SitemapResponse>('/seo/sitemap', { tags: ['sitemap'], revalidate: 900 });
  if (!data) return [];

  const locales = data.locales?.length ? data.locales : [...LOCALES];
  const rows = [...data.urls, ...EXTRA_PAGES.filter((e) => !data.urls.some((u) => u.path === e.path))];

  // One entry per page and language, each with hreflang alternates (including x-default) so Google pairs the translations.
  return rows.flatMap((u) =>
    locales.map((locale) => ({
      url: absoluteUrl(locale, u.path),
      lastModified: u.lastmod ?? undefined,
      changeFrequency: u.changefreq as MetadataRoute.Sitemap[number]['changeFrequency'],
      priority: u.priority,
      alternates: { languages: { ...Object.fromEntries(locales.map((l) => [l, absoluteUrl(l, u.path)])), 'x-default': absoluteUrl('ar', u.path) } },
    })),
  );
}