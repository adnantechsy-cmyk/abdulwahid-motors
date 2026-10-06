import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ContactChannels } from '@/components/site/ContactChannels';
import { Logo } from './Logo';

export async function SiteFooter() {
  const t = await getTranslations('footer');
  const n = await getTranslations('nav');
  const h = await getTranslations('header');

  const quick = [
    { href: '/about', label: n('about') },
    { href: '/vehicles', label: n('vehicles') },
    { href: '/parts', label: n('parts') },
    { href: '/services', label: n('services') },
    { href: '/contact', label: n('contact') },
    { href: '/service-booking', label: h('bookTestDrive') },
  ];
  const portal = [
    { href: '/login', label: h('login') },
    { href: '/register', label: h('register') },
    { href: '/account', label: h('account') },
  ];

  const linkClass = 'text-sm text-awm-muted hover:text-awm-red';

  return (
    <footer className="border-t border-awm-line bg-awm-panel">
      <div className="container-awm grid grid-cols-1 gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm leading-6 text-awm-muted">{t('about')}</p>
        </div>

        <nav aria-label={t('quickLinks')}>
          <h2 className="mb-4 border-s-4 border-awm-red ps-3 text-base font-extrabold">{t('quickLinks')}</h2>
          <ul className="flex flex-col gap-3">
            {quick.map((l) => <li key={l.href}><Link href={l.href} className={linkClass}>{l.label}</Link></li>)}
          </ul>
        </nav>

        <nav aria-label={t('customerPortal')}>
          <h2 className="mb-4 border-s-4 border-awm-red ps-3 text-base font-extrabold">{t('customerPortal')}</h2>
          <ul className="flex flex-col gap-3">
            {portal.map((l) => <li key={l.href}><Link href={l.href} className={linkClass}>{l.label}</Link></li>)}
          </ul>
        </nav>

        <div>
          <h2 className="mb-4 border-s-4 border-awm-red ps-3 text-base font-extrabold">{t('branches')}</h2>
          <ul className="flex flex-col gap-3 text-sm text-awm-muted">
            <li>{t('sahnaya')}</li>
            <li>{t('kafrSousa')}</li>
          </ul>
          <div className="mt-6"><ContactChannels variant="inline" /></div>
        </div>
      </div>

      <div className="border-t border-awm-line">
        <p className="container-awm py-5 text-xs text-awm-muted">{t('rights', { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
