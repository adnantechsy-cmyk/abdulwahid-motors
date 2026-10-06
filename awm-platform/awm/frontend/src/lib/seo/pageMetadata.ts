import 'server-only';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { INDEXABLE } from './indexable';
import { absoluteUrl, defaultOgImage, languageAlternates, ogLocale, otherLocale } from './site';

type Input = {
  locale: string;
  /** Path without locale prefix: 'about', 'vehicles/demo', '' for home. */
  path: string;
  title: string;
  description: string;
  /** Private or duplicate pages: keep out of the index but let crawlers follow links. */
  noindex?: boolean;
  /** Absolute image URL. Falls back to the brand card. */
  image?: string | null;
  type?: 'website' | 'article';
};

/**
 * Complete metadata for a page that has no admin-edited SEO record: title, description, canonical,
 * hreflang, robots, Open Graph and Twitter card. Pages with a Laravel record use toMetadata() instead.
 */
export async function pageMetadata({ locale, path, title, description, noindex = false, image, type = 'website' }: Input): Promise<Metadata> {
  const siteName = (await getTranslations({ locale, namespace: 'brand' }))('name');
  const url = absoluteUrl(locale, path);
  const img = image ?? defaultOgImage(locale);
  const full = `${title} | ${siteName}`;

  return {
    title: { absolute: full },
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    robots: noindex ? { index: false, follow: true } : INDEXABLE,
    openGraph: {
      title: full,
      description,
      url,
      siteName,
      locale: ogLocale(locale),
      alternateLocale: [ogLocale(otherLocale(locale))],
      type,
      images: [{ url: img, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title: full, description, images: [img] },
  };
}
