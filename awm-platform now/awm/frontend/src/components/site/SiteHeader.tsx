import { getTranslations } from 'next-intl/server';
import { CartButton } from '@/components/cart/CartButton';
import { LocaleSwitch } from '@/components/admin/SessionControls';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';
import { AccountLink } from './AccountLink';
import { Brand } from './Brand';

const NAV = [
  ['home', '/'], ['about', '/about'], ['vehicles', '/vehicles'], ['parts', '/parts'], ['service', '/services'], ['contact', '/contact'],
] as const;

export async function SiteHeader() {
  const t = await getTranslations('site.header');

  return (
    <header className="sticky top-0 z-30 border-b border-awm-line bg-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-6 px-4 lg:px-6">
        <Brand name={t('brandName')} tagline={t('brandTagline')} />

        <nav aria-label={t('menu')} className="hidden flex-1 lg:block">
          <ul className="flex items-center justify-center gap-6 text-sm font-bold">
            {NAV.map(([key, href]) => <li key={key}><Link href={href} className="py-2 hover:text-awm-red">{t(`nav.${key}`)}</Link></li>)}
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <LocaleSwitch />
          <CartButton />
          <AccountLink />
          <Link href={{ pathname: '/contact', query: { topic: 'test_drive' } }} className="hidden h-10 items-center bg-awm-red px-4 text-sm font-bold text-white hover:bg-awm-black xl:flex">{t('testDrive')}</Link>

          <details className="relative lg:hidden">
            <summary className="flex size-10 cursor-pointer list-none items-center justify-center border-2 border-awm-black" aria-label={t('menu')}><Icon name="grid" size={18} /></summary>
            <ul className="absolute end-0 top-12 z-40 flex w-64 flex-col border-2 border-awm-black bg-white text-sm font-bold">
              {NAV.map(([key, href]) => <li key={key}><Link href={href} className="block px-4 py-3 hover:bg-awm-surface">{t(`nav.${key}`)}</Link></li>)}
              <li className="border-t border-awm-line"><AccountLink variant="menu" /></li>
            </ul>
          </details>
        </div>
      </div>
    </header>
  );
}
