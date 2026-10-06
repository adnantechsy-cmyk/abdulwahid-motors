/** Public origin, used for every canonical URL, hreflang alternate, Open Graph URL and JSON-LD @id. */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const LOCALES = ['ar', 'en'] as const;
export type SeoLocale = (typeof LOCALES)[number];

/** Absolute URL of a page in a language. `path` has no locale prefix ('vehicles/demo', '' for home). */
export function absoluteUrl(locale: string, path = ''): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return `${SITE}/${locale}${clean ? `/${clean}` : ''}`;
}

/** hreflang map for a page, including x-default (Arabic is the default language). */
export function languageAlternates(path = ''): Record<string, string> {
  return { ...Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(l, path)])), 'x-default': absoluteUrl('ar', path) };
}

export const ogLocale = (locale: string) => (locale === 'ar' ? 'ar_SY' : 'en_US');
export const otherLocale = (locale: string) => (locale === 'ar' ? 'en' : 'ar');

/** Brand card used when a page has no photo of its own (see app/og/route.tsx). */
export const defaultOgImage = (locale: string) => `${SITE}/og?l=${locale === 'ar' ? 'ar' : 'en'}`;

export const ORGANIZATION_ID = `${SITE}/#organization`;
export const WEBSITE_ID = `${SITE}/#website`;
