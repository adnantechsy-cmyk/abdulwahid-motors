import type { Metadata, Viewport } from 'next';
import { Montserrat, Tajawal } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { dirFor, routing } from '@/i18n/routing';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { JsonLd } from '@/components/seo/JsonLd';
import { siteJsonLd } from '@/lib/seo/jsonld';
import { CartHydrator } from '@/store/CartHydrator';
import '../globals.css';

// Sharp, geometric faces only (no cursive / organic / traditional styles).
const arabic = Tajawal({ subsets: ['arabic'], weight: ['400', '500', '700', '800'], variable: '--font-arabic', display: 'swap' });
const latin = Montserrat({ subsets: ['latin'], variable: '--font-latin', display: 'swap' });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const brand = await getTranslations({ locale, namespace: 'brand' });

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    applicationName: 'Abdul Wahid Motors',
    // Pages set their own absolute title; this default covers any page that doesn't (the 404 page, for one).
    title: { default: `${brand('name')} | ${brand('authorized')}`, template: '%s' },
    // Phone numbers on the page are real contact details, not something for the browser to guess at.
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = { themeColor: '#d90429', width: 'device-width', initialScale: 1 };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Only the message groups that client components read are sent to the browser. Everything else is
 * rendered on the server, so shipping it would just make every page's HTML heavier.
 * A client component that needs another group must be added here.
 */
const CLIENT_NAMESPACES = ['cart', 'auth', 'checkout', 'pay', 'booking', 'detail', 'contactForm'] as const;

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as never)) notFound();
  setRequestLocale(locale);

  const all = (await getMessages()) as Record<string, unknown> & { account: { appointments: unknown; error: unknown } };
  const messages = {
    ...Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, all[ns]])),
    account: { appointments: all.account.appointments, error: all.account.error },
  };

  return (
    <html lang={locale} dir={dirFor(locale)} className={`${arabic.variable} ${latin.variable}`}>
      <body className="bg-white font-sans text-awm-black antialiased">
        <JsonLd data={await siteJsonLd(locale)} />
        <NextIntlClientProvider messages={messages}>
          <CartHydrator />
          {children}
          <CartDrawer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
