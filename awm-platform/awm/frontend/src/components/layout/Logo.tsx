import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * Logo: the AW monogram (public/brand/logo-mark.svg) next to the company name as live text.
 * A plain <img> is used because next/image does not optimise SVG; the file is tiny and cached.
 */
/** 	runcate is for the tight header; the footer lets the name wrap instead. */
export async function Logo({ truncate = true }: { truncate?: boolean }) {
  const t = await getTranslations('brand');

  return (
    <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
      <img src="/brand/logo-mark.svg" alt="" width={64} height={20} className="h-5 w-16 shrink-0" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={`${truncate ? 'truncate ' : ''}text-sm font-extrabold sm:text-base`}>{t('name')}</span>
        <span className={`${truncate ? 'truncate ' : ''}text-[0.7rem] font-bold text-awm-red`}>{t('authorized')}</span>
      </span>
    </Link>
  );
}