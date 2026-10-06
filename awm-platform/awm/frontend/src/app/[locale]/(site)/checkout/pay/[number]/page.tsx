import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PaymentFlow } from '@/components/checkout/PaymentFlow';
import { accountGet } from '@/lib/api/account';
import { AUTH_COOKIE } from '@/lib/auth';
import type { PlacedOrder } from '@/lib/checkout-session';
import type { OrderDetail } from '@/types/account';

type Props = { params: Promise<{ locale: string; number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pay' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function PayPage({ params }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  if (!/^[A-Za-z0-9-]{3,40}$/.test(number)) notFound();

  // Signed-in customers: Laravel knows the order, so show its real total. Guests: the browser keeps it.
  const signedIn = (await cookies()).has(AUTH_COOKIE);
  let initial: PlacedOrder | null = null;
  if (signedIn) {
    const order = await accountGet<OrderDetail>(`/account/orders/${number}`, locale);
    if (!order) notFound();
    initial = { number: order.number, flow: order.flow, currency: order.currency, grand_total: order.grand_total };
  }

  const t = await getTranslations('pay');
  return (
    <main className="container-awm py-10">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{t('title')}</h1>
      <p className="mb-8 mt-3 max-w-2xl text-awm-muted">{t('description')}</p>
      <PaymentFlow number={number} signedIn={signedIn} initial={initial} />
    </main>
  );
}
