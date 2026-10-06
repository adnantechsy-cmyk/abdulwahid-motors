import { getTranslations } from 'next-intl/server';
import { CartButton } from '@/components/cart/CartButton';
import { ButtonLink } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';
import { NavLinks } from './NavLinks';

export async function SiteHeader() {
  const t = await getTranslations('nav');
  const h = await getTranslations('header');

  const items = [
    { href: '/', label: t('home') },
    { href: '/about', label: t('about') },
    { href: '/vehicles', label: t('vehicles') },
    { href: '/parts', label: t('parts') },
    { href: '/services', label: t('services') },
    { href: '/contact', label: t('contact') },
  ];

  const login = { href: '/login', label: h('login') };
  const register = { href: '/register', label: h('register') };
  const testDrive = { href: '/service-booking', label: h('bookTestDrive') };

  return (
    <header className="relative z-40 border-b border-awm-line bg-white">
      <div className="container-awm flex h-20 items-center justify-between gap-2 sm:gap-4">
        <Logo />

        <div className="hidden lg:block">
          <NavLinks items={items} label={t('label')} />
        </div>

        <div className="flex items-center gap-2">
          <CartButton />
          <LocaleSwitcher label={h('languageLabel')} text={h('language')} />
          <div className="hidden items-center gap-2 xl:flex">
            <Link href={login.href} className="px-3 py-2 text-sm font-bold hover:text-awm-red">{login.label}</Link>
            <ButtonLink href={register.href} variant="outline" size="sm">{register.label}</ButtonLink>
          </div>
          <ButtonLink href={testDrive.href} size="sm" className="max-md:hidden">{testDrive.label}</ButtonLink>
          <MobileMenu
            items={items}
            navLabel={t('label')}
            openLabel={h('openMenu')}
            closeLabel={h('closeMenu')}
            login={login}
            register={register}
            testDrive={testDrive}
          />
        </div>
      </div>
    </header>
  );
}
