import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CheckoutClient } from '@/components/checkout/CheckoutClient';
import { apiGet } from '@/lib/api/server';
import type { SiteSettings } from '@/types/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkout');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/** Figma 1:19201. Cart -> delivery & customer -> payment -> confirmation. */
export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await apiGet<SiteSettings>('/settings', { locale, tags: ['settings'] }).catch(() => null);

  return <CheckoutClient settings={settings} />;
}
