import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AccountNav } from '@/components/account/AccountNav';

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });
  // Private pages: never indexed.
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function AccountLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('account');

  const items = [
    { href: '/account', label: t('nav.overview') },
    { href: '/account/orders', label: t('nav.orders') },
    { href: '/account/vehicles', label: t('nav.vehicles') },
    { href: '/account/invoices', label: t('nav.invoices') },
    { href: '/account/appointments', label: t('nav.appointments') },
  ];

  return (
    <main className="container-awm py-10">
      <AccountNav items={items} label={t('navLabel')} />
      {children}
    </main>
  );
}
