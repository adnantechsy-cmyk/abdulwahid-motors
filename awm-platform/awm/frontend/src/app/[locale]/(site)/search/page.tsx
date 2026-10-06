import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PartCard } from '@/components/catalog/PartCard';
import { VehicleCard } from '@/components/catalog/VehicleCard';
import { SearchForm } from '@/components/site/SearchForm';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { param } from '@/lib/listing';
import { cleanQuery, MIN_QUERY, searchCatalogue } from '@/lib/search';
import { pageMetadata } from '@/lib/seo/pageMetadata';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Result pages are endless near-duplicates of the catalogue: crawlers follow the links but don't index them.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo.search' });
  return pageMetadata({ locale, path: 'search', title: t('title'), description: t('description'), noindex: true });
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('search');

  const query = cleanQuery(param(await searchParams, 'q'));
  const searched = query.length >= MIN_QUERY;
  const result = searched ? await searchCatalogue(locale, query) : null;
  const total = result ? result.vehicles.length + result.partsTotal : 0;

  return (
    <main className="container-awm py-10">
      <h1 className="mb-6 text-3xl font-extrabold sm:text-4xl">{t('title')}</h1>
      <SearchForm query={query} />

      {query && !searched && <p role="status" className="mt-6 text-awm-muted">{t('tooShort')}</p>}

      {result && (
        <div className="mt-8 flex flex-col gap-10">
          <p role="status" className="text-sm font-bold text-awm-muted">{t('summary', { count: total, query })}</p>

          {result.incomplete && <p role="alert" className="border-s-4 border-awm-red bg-awm-panel p-4 text-sm font-medium">{t('unavailable')}</p>}

          {result.vehicles.length > 0 && (
            <section aria-labelledby="search-cars">
              <h2 id="search-cars" className="mb-4 text-2xl font-extrabold">{t('cars')}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {result.vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} locale={locale} />)}
              </div>
            </section>
          )}

          {result.parts.length > 0 && (
            <section aria-labelledby="search-parts">
              <h2 id="search-parts" className="mb-4 text-2xl font-extrabold">{t('parts')}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {result.parts.map((p) => <PartCard key={p.id} part={p} locale={locale} />)}
              </div>
              {result.partsTotal > result.parts.length && (
                <ButtonLink href={{ pathname: '/parts', query: { q: query } }} variant="outline" size="md" className="mt-6">{t('allParts')}<Icon name="arrow" size={16} /></ButtonLink>
              )}
            </section>
          )}

          {total === 0 && !result.incomplete && (
            <section aria-labelledby="search-none" className="border border-dashed border-awm-line bg-white p-8">
              <h2 id="search-none" className="mb-2 text-xl font-extrabold">{t('none')}</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <ButtonLink href="/vehicles" variant="dark" size="md">{t('cars')}</ButtonLink>
                <ButtonLink href="/parts" variant="outline" size="md">{t('parts')}</ButtonLink>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
