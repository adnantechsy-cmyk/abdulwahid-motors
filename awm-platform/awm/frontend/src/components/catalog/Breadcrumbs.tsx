import { getTranslations } from 'next-intl/server';
import { JsonLd } from '@/components/seo/JsonLd';
import { Link } from '@/i18n/navigation';

type Crumb = { label: string; href?: string };

/** Visible breadcrumb trail plus the matching schema.org BreadcrumbList. The last crumb is the current page. */
export async function Breadcrumbs({ items, locale }: { items: Crumb[]; locale: string }) {
  const t = await getTranslations('detail');
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const all: Crumb[] = [{ label: t('home'), href: '/' }, ...items];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${site}/${locale}${c.href === '/' ? '' : c.href}` } : {}),
    })),
  };

  return (
    <nav aria-label={t('breadcrumb')} className="mb-6 text-sm">
      <JsonLd data={jsonLd} />
      <ol className="flex flex-wrap items-center gap-2 text-awm-muted">
        {all.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-awm-red">{c.label}</Link>
            ) : (
              <span aria-current="page" className="font-bold text-awm-black">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
