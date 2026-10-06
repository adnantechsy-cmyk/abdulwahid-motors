import type { Metadata } from 'next';
import { IBM_Plex_Mono, Montserrat, Tajawal } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { dirFor, routing } from '@/i18n/routing';
import { CartHydrator } from '@/store/CartHydrator';
import '../globals.css';

// Sharp, geometric faces only (no cursive / organic / traditional styles).
const arabic = Tajawal({ subsets: ['arabic'], weight: ['400', '500', '700', '800'], variable: '--font-arabic', display: 'swap' });
const latin = Montserrat({ subsets: ['latin'], variable: '--font-latin', display: 'swap' });
// Codes only (SKU, VIN, invoice numbers, figures), as in the designs.
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-code', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as never)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={dirFor(locale)} className={`${arabic.variable} ${latin.variable} ${mono.variable}`}>
      <body className="bg-white font-sans text-awm-black antialiased">
        <NextIntlClientProvider messages={messages}>
          <CartHydrator />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
