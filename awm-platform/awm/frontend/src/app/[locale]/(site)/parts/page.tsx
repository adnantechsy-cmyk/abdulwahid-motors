import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Pagination } from '@/components/catalog/Pagination';
import { PartCard } from '@/components/catalog/PartCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { ButtonLink } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { apiGet } from '@/lib/api/server';
import { getCategories, getPartList } from '@/lib/api/catalog';
import { pageParam, param, toQuery } from '@/lib/listing';
import { toMetadata } from '@/lib/seo/buildMetadata';
import type { SeoPayload } from '@/types/seo';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function getSeo(locale: string): Promise<SeoPayload | null> {
  try {
    return await apiGet<SeoPayload>('/seo/routes/parts', { locale, tags: ['seo'] });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const seo = await getSeo(locale);
  const meta = seo ? toMetadata(seo) : {};
  const filtered = Object.keys(await searchParams).length > 0;
  return filtered ? { ...meta, robots: { index: false, follow: true } } : meta;
}

const field =
  'h-12 w-full border border-awm-line bg-white px-4 text-base placeholder:text-awm-muted/60 focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-awm-red';

export default async function PartsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const raw = await searchParams;
  const q = param(raw, 'q');
  const model = param(raw, 'model');
  const category = param(raw, 'category');
  const inStock = param(raw, 'in_stock') === '1';
  const page = pageParam(raw);

  const [t, seo, categories, list] = await Promise.all([
    getTranslations('catalog'),
    getSeo(locale),
    getCategories(locale, 'spare_part'),
    getPartList(locale, { q, model, category, in_stock: inStock, page }),
  ]);

  const hrefForPage = (p: number) => ({
    pathname: '/parts' as const,
    query: toQuery({ q, model, category, in_stock: inStock, page: p }),
  });
  const hasFilters = Boolean(q || model || category || inStock);

  return (
    <main className="container-awm py-12">
      {seo && <JsonLd data={seo.json_ld} />}
      <SectionHeading as="h1" eyebrow={t('parts.eyebrow')} title={t('parts.title')} description={t('parts.description')} />

      {/* Plain GET form: no JavaScript needed, and every search is a shareable URL. */}
      <form method="get" role="search" className="mb-8 grid grid-cols-1 items-end gap-4 border border-awm-line bg-white p-4 md:grid-cols-[2fr_1fr_1fr_auto]">
        <label className="flex flex-col gap-2 text-sm font-bold">
          {t('parts.searchLabel')}
          <input name="q" type="search" defaultValue={q} placeholder={t('parts.searchPlaceholder')} className={field} />
        </label>
        <label className="flex flex-col gap-2 text-sm font-bold">
          {t('parts.model')}
          <input name="model" defaultValue={model} placeholder={t('parts.modelPlaceholder')} dir="ltr" className={`${field} text-start`} />
        </label>
        {categories.length > 0 ? (
          <label className="flex flex-col gap-2 text-sm font-bold">
            {t('parts.category')}
            <select name="category" defaultValue={category ?? ''} className={field}>
              <option value="">{t('all')}</option>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
        ) : <span className="hidden md:block" />}
        <button type="submit" className="h-12 bg-awm-red px-8 text-sm font-bold text-white hover:bg-awm-black">{t('parts.submit')}</button>

        <label className="flex items-center gap-3 text-sm font-bold md:col-span-4">
          <input name="in_stock" type="checkbox" value="1" defaultChecked={inStock} className="size-5 accent-awm-red" />
          {t('parts.inStock')}
        </label>
      </form>

      {list === null ? (
        <p role="alert" className="border border-dashed border-awm-line bg-white p-8 text-center text-awm-muted">{t('unavailable')}</p>
      ) : list.data.length === 0 ? (
        <div className="flex flex-col items-center gap-4 border border-dashed border-awm-line bg-white p-10 text-center">
          <p className="text-awm-muted">{t('parts.empty')}</p>
          {hasFilters && <ButtonLink href="/parts" variant="outline" size="sm">{t('clear')}</ButtonLink>}
        </div>
      ) : (
        <>
          <p aria-live="polite" className="mb-4 text-sm font-bold text-awm-muted">{t('results', { count: list.meta.total })}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {list.data.map((p) => <PartCard key={p.id} part={p} locale={locale} />)}
          </div>
          <Pagination current={list.meta.current_page} last={list.meta.last_page} href={hrefForPage} />
        </>
      )}
    </main>
  );
}
