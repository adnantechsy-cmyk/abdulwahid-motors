import { getTranslations } from 'next-intl/server';
import { CartButton } from '@/components/cart/CartButton';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';
import { AuthLinks } from './AuthLinks';
import { LocaleSwitcher } from './LocaleSwitcher';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';
import { NavLinks } from './NavLinks';

export async function SiteHeader() {
  const t = await getTranslations('nav');
  const h = await getTranslations('header');
  const s = await getTranslations('search');

  const items = [
    { href: '/', label: t('home') },
    { href: '/about', label: t('about') },
    { href: '/vehicles', label: t('vehicles') },
    { href: '/parts', label: t('parts') },
    { href: '/services', label: t('services') },
    { href: '/contact', label: t('contact') },
  ];

  const auth = { login: h('login'), register: h('register'), logout: h('logout') };
  const testDrive = { href: '/service-booking', label: h('bookTestDrive') };

  return (
    <header className="relative z-40 border-b border-awm-line bg-white">
      <div className="container-awm flex h-20 items-center justify-between gap-2 sm:gap-4">
        <Logo />

        <div className="hidden lg:block">
          <NavLinks items={items} label={t('label')} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/search" aria-label={h('search')} className="flex size-10 items-center justify-center border-2 border-transparent hover:border-awm-black max-sm:hidden">
            <Icon name="search" size={20} />
          </Link>
          <CartButton />
          <LocaleSwitcher label={h('languageLabel')} text={h('language')} />
          <AuthLinks labels={auth} />
          <ButtonLink href={testDrive.href} size="sm" className="max-md:hidden">{testDrive.label}</ButtonLink>
          <MobileMenu
            items={items}
            navLabel={t('label')}
            openLabel={h('openMenu')}
            closeLabel={h('closeMenu')}
            auth={auth}
            testDrive={testDrive}
            search={{ label: s('label'), placeholder: s('placeholder'), submit: s('submit') }}
          />
        </div>
      </div>
    </header>
  );
}
