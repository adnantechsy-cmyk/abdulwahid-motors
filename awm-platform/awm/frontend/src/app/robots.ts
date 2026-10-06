import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo/site';

/**
 * Crawlers may read the public site (including /og, the social preview image, which social networks fetch). Private areas, API routes and search results stay out;
 * filtered catalogue views are crawlable but marked noindex in their own metadata.
 */
export default function robots(): MetadataRoute.Robots {
  const private_ = ['admin', 'account', 'checkout', 'login', 'register', 'search', 'certificates'];

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', ...['ar', 'en'].flatMap((l) => private_.map((p) => `/${l}/${p}`))] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}