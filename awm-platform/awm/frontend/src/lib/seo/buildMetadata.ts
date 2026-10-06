import type { Metadata } from 'next';
import type { SeoPayload } from '@/types/seo';
import { INDEXABLE } from './indexable';
import { defaultOgImage, ogLocale, otherLocale } from './site';

/** "index,follow" / "noindex, follow" from the admin -> Next's robots object. */
function robotsFrom(value: string): Metadata['robots'] {
  const parts = value.toLowerCase().split(',').map((p) => p.trim());
  const index = !parts.includes('noindex');
  const follow = !parts.includes('nofollow');
  return index && follow ? INDEXABLE : { index, follow };
}

/**
 * Laravel SEO payload -> Next.js Metadata (used inside generateMetadata).
 * The admin controls title, description and image; this adds what every page needs
 * regardless: site name, alternate locale, large image previews and a brand-card fallback image.
 */
export function toMetadata(seo: SeoPayload, locale?: string): Metadata {
  const og = seo.open_graph;
  const lang = locale ?? (og.locale.startsWith('ar') ? 'ar' : 'en');
  const image = og.image ?? defaultOgImage(lang);
  const siteName = lang === 'ar' ? 'عبد الواحد موتورز' : 'Abdul Wahid Motors';

  return {
    title: { absolute: seo.title }, // the admin controls the full title, no template suffix
    description: seo.description ?? undefined,
    keywords: seo.keywords ?? undefined,
    robots: robotsFrom(seo.robots),
    alternates: {
      canonical: seo.canonical,
      languages: { ...seo.alternates, 'x-default': seo.alternates.ar ?? seo.canonical },
    },
    openGraph: {
      title: og.title,
      description: og.description ?? undefined,
      url: seo.canonical,
      siteName,
      locale: og.locale || ogLocale(lang),
      alternateLocale: [ogLocale(otherLocale(lang))],
      // Next's typed OpenGraph has no "product"; "website" is the closest valid value.
      type: og.type === 'article' ? 'article' : 'website',
      images: [{ url: image, alt: og.title }],
    },
    twitter: {
      card: seo.twitter_card,
      title: og.title,
      description: og.description ?? undefined,
      images: [image],
    },
  };
}
