import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/** Text wordmark until the final AWM logo SVG is added under public/brand/. */
export async function Logo() {
  const t = await getTranslations('brand');

  return (
    <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label={t('name')}>
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center bg-awm-black text-sm font-extrabold tracking-tight text-white">AWM</span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-extrabold sm:text-base">{t('name')}</span>
        <span className="truncate text-[0.7rem] font-bold text-awm-red">{t('authorized')}</span>
      </span>
    </Link>
  );
}
