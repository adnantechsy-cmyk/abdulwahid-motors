'use client';

import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/** Swaps /ar <-> /en on the same page. A real link, so it works without JS and crawlers follow it. */
export function LocaleSwitcher({ label, text }: { label: string; text: string }) {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <Link
      href={pathname}
      locale={locale === 'ar' ? 'en' : 'ar'}
      title={label}
      lang={locale === 'ar' ? 'en' : 'ar'}
      className="flex h-10 items-center border-2 border-awm-black px-3 text-sm font-bold hover:bg-awm-black hover:text-white"
    >
      {text}
    </Link>
  );
}
