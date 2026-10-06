import type { MetadataRoute } from 'next';
import { apiGet } from '@/lib/api/server';
import type { SitemapResponse } from '@/types/seo';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** /sitemap.xml: rebuilt from Laravel; purged by the admin SEO module via /api/revalidate. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await apiGet<SitemapResponse>('/seo/sitemap', { tags: ['sitemap'], revalidate: 900 });
  if (!data) return [];

  const url = (locale: string, path: string) => `${SITE}/${locale}${path ? `/${path}` : ''}`;

  // One entry per page with hreflang alternates; Google reads the alternates from each <url>.
  return data.urls.flatMap((u) =>
    data.locales.map((locale) => ({
      url: url(locale, u.path),
      lastModified: u.lastmod ?? undefined,
      changeFrequency: u.changefreq as MetadataRoute.Sitemap[number]['changeFrequency'],
      priority: u.priority,
      alternates: { languages: Object.fromEntries(data.locales.map((l) => [l, url(l, u.path)])) },
    })),
  );
}
