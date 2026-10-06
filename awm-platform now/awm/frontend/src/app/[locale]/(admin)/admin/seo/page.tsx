import { getTranslations } from 'next-intl/server';
import { SeoEditor, type SeoTarget } from '@/components/admin/SeoEditor';
import { Badge, Kpi, KpiStrip, PageHeader, TabLinks, cx } from '@/components/ui/primitives';
import { Link } from '@/i18n/navigation';
import { authedGet } from '@/lib/session';

type Item = { type: string; key: string; label: string | null; url: string; has_custom: boolean; title: string; title_length: number; description_length: number; robots: string };
type Targets = { summary: { total: number; customised: number; missing_description: number; title_out_of_range: number; in_sitemap: number }; items: Item[] };
type Search = { type?: string; key?: string; group?: string };

const GROUPS = ['route', 'vehicle', 'spare_part', 'page'] as const;

/** Figma 1:18607 "SEO & meta settings". Metrics are our own audit, not Google data. */
export default async function SeoAdmin({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations('admin.seo');

  const targets = await authedGet<Targets>(`/admin/seo/targets?locale=${locale}`, locale, `/${locale}/admin/seo`);
  if (!targets) return <p>{t('noAccess')}</p>;

  const group = (GROUPS as readonly string[]).includes(sp.group ?? '') ? sp.group! : (sp.type ?? 'route');
  const items = targets.items.filter((i) => i.type === group);
  const current = sp.type && sp.key ? targets.items.find((i) => i.type === sp.type && i.key === String(sp.key)) : items[0];
  const detail = current ? await authedGet<SeoTarget>(`/admin/seo/targets/${current.type}/${current.key}`, locale) : null;
  const s = targets.summary;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} />

      <KpiStrip>
        <Kpi label={t('kpi.urls')} icon="globe" value={s.total} foot={t('kpi.inSitemap', { n: s.in_sitemap })} />
        <Kpi label={t('kpi.customised')} icon="pencil" value={s.customised} foot={t('kpi.customisedFoot')} />
        <Kpi label={t('kpi.missingDescription')} icon="alert" tone={s.missing_description ? 'red' : 'default'} value={s.missing_description} foot={t('kpi.missingFoot')} />
        <Kpi label={t('kpi.titleRange')} icon="alert" tone={s.title_out_of_range ? 'red' : 'default'} value={s.title_out_of_range} foot={t('kpi.titleFoot')} />
      </KpiStrip>

      <TabLinks tabs={GROUPS.map((g) => ({ href: { pathname: '/admin/seo', query: { group: g } }, label: `${t(`groups.${g}`)} (${targets.items.filter((i) => i.type === g).length})`, active: group === g }))} />

      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <nav aria-label={t('pages')} className="flex max-h-[70vh] flex-col overflow-y-auto border border-awm-line">
          {items.length === 0 && <p className="p-4 text-sm text-awm-muted">{t('noPages')}</p>}
          {items.map((i) => {
            const active = current?.type === i.type && current.key === i.key;
            const warn = i.description_length === 0 || i.title_length < 30 || i.title_length > 60;
            return (
              <Link key={`${i.type}:${i.key}`} href={{ pathname: '/admin/seo', query: { group, type: i.type, key: i.key } }} aria-current={active ? 'page' : undefined}
                className={cx('flex flex-col gap-1 border-b border-s-4 border-b-awm-line p-3 text-sm', active ? 'border-s-awm-red bg-awm-surface' : 'border-s-transparent hover:bg-awm-surface')}>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-bold">{i.type === 'route' ? t(`routes.${i.key}`) : i.label}</span>
                  {warn ? <Badge tone="outlineRed">{t('needsWork')}</Badge> : i.has_custom && <Badge tone="ok">{t('ok')}</Badge>}
                </span>
                <span className="truncate font-mono text-xs text-awm-muted" dir="ltr">{i.url.replace(/^https?:\/\//, '')}</span>
              </Link>
            );
          })}
        </nav>
        {detail && current ? (
          <SeoEditor key={`${current.type}:${current.key}`} target={detail} label={current.type === 'route' ? t(`routes.${current.key}`) : (current.label ?? '')} />
        ) : (
          <p className="text-sm text-awm-muted">{t('pickPage')}</p>
        )}
      </div>
    </div>
  );
}
