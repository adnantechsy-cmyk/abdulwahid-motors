import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'always', // /ar/... and /en/...: one indexable URL per language
});

export type Locale = (typeof routing.locales)[number];

export const dirFor = (locale: string): 'rtl' | 'ltr' => (locale === 'ar' ? 'rtl' : 'ltr');
