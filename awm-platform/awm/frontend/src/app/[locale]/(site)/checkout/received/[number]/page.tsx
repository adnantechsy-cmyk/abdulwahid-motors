import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { OrderReceived } from '@/components/checkout/OrderReceived';
import { AUTH_COOKIE } from '@/lib/auth';
import { contactChannels } from '@/lib/site.config';

type Props = { params: Promise<{ locale: string; number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'received' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/** Shown right after the order is placed (default checkout mode). Nothing about the order is fetched: it is only a confirmation. */
export default async function ReceivedPage({ params }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  if (!/^[A-Za-z0-9-]{3,40}$/.test(number)) notFound();

  const signedIn = (await cookies()).has(AUTH_COOKIE);
  const t = await getTranslations('received');
  const c = contactChannels();

  return (
    <main className="container-awm py-10">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{t('title')}</h1>
      <p className="mb-8 mt-3 max-w-2xl text-awm-muted">{t('description')}</p>
      <OrderReceived number={number} signedIn={signedIn} whatsappHref={c.whatsappHref} phone={c.phone} />
    </main>
  );
}
