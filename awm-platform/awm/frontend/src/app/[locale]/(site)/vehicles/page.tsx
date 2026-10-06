import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FilterChips } from '@/components/catalog/FilterChips';
import { Pagination } from '@/components/catalog/Pagination';
import { VehicleCard } from '@/components/catalog/VehicleCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ButtonLink } from '@/components/ui/Button';
import { apiGet } from '@/lib/api/server';
import { getCategories, getVehicleList, POWERTRAINS, VEHICLE_STATUSES } from '@/lib/api/catalog';
import { oneOf, pageParam, param, toQuery } from '@/lib/listing';
import { toMetadata } from '@/lib/seo/buildMetadata';
import type { SeoPayload } from '@/types/seo';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function getSeo(locale: string): Promise<SeoPayload | null> {
  try {
    return await apiGet<SeoPayload>('/seo/routes/vehicles', { locale, tags: ['seo'] });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const seo = await getSeo(locale);
  const meta = seo ? toMetadata(seo) : {};
  // Filtered and paged views duplicate the main list: keep them out of the index.
  const filtered = Object.keys(await searchParams).length > 0;
  return filtered ? { ...meta, robots: { index: false, follow: true } } : meta;
}

export default async function VehiclesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const raw = await searchParams;
  const powertrain = oneOf(param(raw, 'powertrain'), POWERTRAINS);
  const status = oneOf(param(raw, 'status'), VEHICLE_STATUSES);
  const category = param(raw, 'category');
  const page = pageParam(raw);

  const [t, tv, seo, categories, list] = await Promise.all([
    getTranslations('catalog'),
    getTranslations('vehicle'),
    getSeo(locale),
    getCategories(locale, 'vehicle'),
    getVehicleList(locale, { powertrain, status, category, page }),
  ]);

  const current = { powertrain, status, category };
  const hrefFor = (override: Partial<Record<'powertrain' | 'status' | 'category' | 'page', string | number | undefined>>) => ({
    pathname: '/vehicles' as const,
    query: toQuery({ ...current, page: undefined, ...override }),
  });
  const hasFilters = Boolean(powertrain || status || category);

  return (
    <main className="container-awm py-12">
      {seo && <JsonLd data={seo.json_ld} />}
      <SectionHeading as="h1" eyebrow={t('vehicles.eyebrow')} title={t('vehicles.title')} description={t('vehicles.description')} />

      <section aria-label={t('vehicles.filtersLabel')} className="mb-8 flex flex-col gap-3 border border-awm-line bg-white p-4">
        <FilterChips
          label={t('vehicles.powertrain')}
          allLabel={t('all')}
          current={powertrain}
          options={POWERTRAINS.map((v) => ({ value: v, label: tv(`powertrain.${v}`) }))}
          href={(v) => hrefFor({ powertrain: v })}
        />
        <FilterChips
          label={t('vehicles.status')}
          allLabel={t('all')}
          current={status}
          options={VEHICLE_STATUSES.map((v) => ({ value: v, label: tv(`status.${v}`) }))}
          href={(v) => hrefFor({ status: v })}
        />
        {categories.length > 0 && (
          <FilterChips
            label={t('vehicles.category')}
            allLabel={t('all')}
            current={category}
            options={categories.map((c) => ({ value: c.slug, label: c.name }))}
            href={(v) => hrefFor({ category: v })}
          />
        )}
      </section>

      {list === null ? (
        <p role="alert" className="border border-dashed border-awm-line bg-white p-8 text-center text-awm-muted">{t('unavailable')}</p>
      ) : list.data.length === 0 ? (
        <div className="flex flex-col items-center gap-4 border border-dashed border-awm-line bg-white p-10 text-center">
          <p className="text-awm-muted">{t('vehicles.empty')}</p>
          {hasFilters && <ButtonLink href="/vehicles" variant="outline" size="sm">{t('clear')}</ButtonLink>}
        </div>
      ) : (
        <>
          <p aria-live="polite" className="mb-4 text-sm font-bold text-awm-muted">{t('results', { count: list.meta.total })}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {list.data.map((v, i) => <VehicleCard key={v.id} vehicle={v} locale={locale} priority={i < 4} />)}
          </div>
          <Pagination current={list.meta.current_page} last={list.meta.last_page} href={(p) => hrefFor({ page: p })} />
        </>
      )}
    </main>
  );
}
