import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';

type Props = {
  current: number;
  last: number;
  href: (page: number) => React.ComponentProps<typeof Link>['href'];
};

/** Prev / numbered / next. Shows the first, last and a window around the current page. */
export async function Pagination({ current, last, href }: Props) {
  if (last <= 1) return null;
  const t = await getTranslations('catalog');

  const pages = new Set([1, last, current - 1, current, current + 1]);
  const list = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);

  const box = 'flex h-10 min-w-10 items-center justify-center border px-3 text-sm font-bold';
  const link = `${box} border-awm-line bg-white hover:border-awm-black`;

  return (
    <nav aria-label={t('pagination')} className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {current > 1 ? (
        <Link href={href(current - 1)} rel="prev" className={link}><Icon name="arrow" size={16} className="rotate-180" /><span className="ms-2">{t('prev')}</span></Link>
      ) : null}

      {list.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && p - list[i - 1] > 1 && <span aria-hidden="true" className="px-1 text-awm-muted">…</span>}
          {p === current ? (
            <span aria-current="page" className={`${box} border-awm-black bg-awm-black text-white`}>{p}</span>
          ) : (
            <Link href={href(p)} aria-label={t('page', { page: p })} className={link}>{p}</Link>
          )}
        </span>
      ))}

      {current < last ? (
        <Link href={href(current + 1)} rel="next" className={link}><span className="me-2">{t('next')}</span><Icon name="arrow" size={16} /></Link>
      ) : null}
    </nav>
  );
}
