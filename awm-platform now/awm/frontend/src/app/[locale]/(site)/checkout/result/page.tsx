import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ResultClient } from '@/components/checkout/ResultClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkoutResult');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function CheckoutResultPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <ResultClient />;
}
