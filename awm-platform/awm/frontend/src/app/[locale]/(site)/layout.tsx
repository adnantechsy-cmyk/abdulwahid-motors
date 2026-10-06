import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('common');

  return (
    <div className="flex min-h-screen flex-col bg-awm-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:bg-awm-black focus:px-4 focus:py-2 focus:text-white"
      >
        {t('skipToContent')}
      </a>
      <SiteHeader />
      <div id="main" className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
