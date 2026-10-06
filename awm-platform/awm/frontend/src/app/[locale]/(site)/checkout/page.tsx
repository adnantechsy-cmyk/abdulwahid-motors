import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('checkout');

  return (
    <main className="container-awm py-10">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{t('title')}</h1>
      <p className="mb-8 mt-3 max-w-2xl text-awm-muted">{t('description')}</p>
      <CheckoutForm />
    </main>
  );
}
