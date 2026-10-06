import type { Metadata } from 'next';
import type { SeoPayload } from '@/types/seo';

/** Laravel SEO payload -> Next.js Metadata (used inside generateMetadata). */
export function toMetadata(seo: SeoPayload): Metadata {
  const og = seo.open_graph;

  return {
    title: { absolute: seo.title }, // the admin controls the full title, no template suffix
    description: seo.description ?? undefined,
    keywords: seo.keywords ?? undefined,
    robots: seo.robots,
    alternates: {
      canonical: seo.canonical,
      languages: { ...seo.alternates, 'x-default': seo.alternates.ar ?? seo.canonical },
    },
    openGraph: {
      title: og.title,
      description: og.description ?? undefined,
      url: seo.canonical,
      locale: og.locale,
      // Next's typed OpenGraph has no "product"; "website" is the closest valid value.
      type: og.type === 'article' ? 'article' : 'website',
      images: og.image ? [{ url: og.image }] : undefined,
    },
    twitter: {
      card: seo.twitter_card,
      title: og.title,
      description: og.description ?? undefined,
      images: og.image ? [og.image] : undefined,
    },
  };
}
