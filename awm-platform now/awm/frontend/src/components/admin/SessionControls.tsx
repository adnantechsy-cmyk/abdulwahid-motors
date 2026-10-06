'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';

export function LocaleSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === 'ar' ? 'en' : 'ar';

  return (
    <button type="button" onClick={() => router.replace(pathname, { locale: next })}
      className="border border-awm-black px-2 py-1 font-mono text-xs font-bold hover:bg-awm-black hover:text-white"
      lang={next} aria-label={next === 'en' ? 'Switch to English' : 'التبديل إلى العربية'}>
      {next.toUpperCase()}
    </button>
  );
}

export function LogoutButton() {
  const t = useTranslations('admin');
  const locale = useLocale();

  return (
    <button type="button"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = `/${locale}/login`;
      }}
      className="flex w-full items-center justify-center gap-2 border border-awm-line py-2 text-sm font-bold text-awm-red hover:border-awm-red">
      <Icon name="logout" size={16} />
      {t('logout')}
    </button>
  );
}
