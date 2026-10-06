'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';
import { ROLE_HINT_COOKIE } from '@/lib/auth';

/** Login/register links, or the account link once signed in. Reads the non-secret role hint. */
export function AccountLink({ variant = 'header' }: { variant?: 'header' | 'menu' }) {
  const t = useTranslations('site.header');
  const [role, setRole] = useState<'staff' | 'customer' | null>(null);

  useEffect(() => {
    const m = document.cookie.match(new RegExp(`(?:^|; )${ROLE_HINT_COOKIE}=(staff|customer)`));
    setRole(m ? (m[1] as 'staff' | 'customer') : null);
  }, []);

  if (variant === 'menu') {
    return <Link href={role ? (role === 'staff' ? '/admin' : '/account') : '/login'} className="block px-4 py-3 hover:bg-awm-surface">{role ? t('myAccount') : t('login')}</Link>;
  }

  if (role) {
    return (
      <Link href={role === 'staff' ? '/admin' : '/account'} className="hidden h-10 items-center gap-2 border-2 border-awm-black px-3 text-sm font-bold hover:bg-awm-black hover:text-white sm:flex">
        <Icon name="user" size={16} />{role === 'staff' ? t('dashboard') : t('myAccount')}
      </Link>
    );
  }

  return (
    <>
      <Link href="/login" className="hidden h-10 items-center px-2 text-sm font-bold hover:text-awm-red sm:flex">{t('login')}</Link>
      <Link href="/register" className="hidden h-10 items-center border-2 border-awm-red px-3 text-sm font-bold text-awm-red hover:bg-awm-red hover:text-white md:flex">{t('register')}</Link>
    </>
  );
}
