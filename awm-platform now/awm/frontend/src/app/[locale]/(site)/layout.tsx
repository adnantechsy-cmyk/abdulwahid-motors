import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { apiGet } from '@/lib/api/server';
import type { SiteSettings } from '@/types/site';

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // No cookies() here: public pages stay statically cacheable (account link is client-side).
  const settings = await apiGet<SiteSettings>('/settings', { locale, tags: ['settings'] }).catch(() => null);
  const t = await getTranslations('site');

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:bg-awm-black focus:p-3 focus:text-white">{t('skipToContent')}</a>
      <SiteHeader />
      <div id="main" className="min-h-[60vh]">{children}</div>
      <SiteFooter settings={settings} />
      <CartDrawer />
    </>
  );
}
