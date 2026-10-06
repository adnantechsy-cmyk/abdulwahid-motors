/** Shape returned by Laravel SeoService (GET /seo/...). */
export interface SeoPayload {
  title: string;
  description: string | null;
  keywords: string | null;
  canonical: string;
  robots: string;
  open_graph: {
    title: string;
    description: string | null;
    image: string | null;
    type: 'website' | 'product' | 'article';
    locale: string;
  };
  twitter_card: 'summary' | 'summary_large_image';
  alternates: Record<string, string>;
  json_ld: Record<string, unknown>[];
}

export interface SitemapResponse {
  locales: string[];
  urls: { path: string; lastmod: string | null; changefreq: string; priority: number }[];
}
