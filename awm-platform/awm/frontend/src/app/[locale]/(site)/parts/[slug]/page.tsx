import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs';
import { Gallery } from '@/components/catalog/Gallery';
import { PartCard } from '@/components/catalog/PartCard';
import { SpecList, type SpecRow } from '@/components/catalog/SpecList';
import { JsonLd } from '@/components/seo/JsonLd';
import { Tag } from '@/components/ui/Tag';
import { apiGet } from '@/lib/api/server';
import { getPartList } from '@/lib/api/catalog';
import { formatMoney, formatNumber } from '@/lib/format';
import { toMetadata } from '@/lib/seo/buildMetadata';
import type { SparePartDto } from '@/types/api';
import type { SeoPayload } from '@/types/seo';

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const seo = await apiGet<SeoPayload>(`/seo/parts/${slug}`, { locale, tags: ['seo'] });
  return seo ? toMetadata(seo, locale) : {};
}

export default async function PartPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [part, seo] = await Promise.all([
    apiGet<SparePartDto>(`/parts/${slug}`, { locale, tags: ['parts'] }),
    apiGet<SeoPayload>(`/seo/parts/${slug}`, { locale, tags: ['seo'] }),
  ]);
  if (!part) notFound();

  const [t, tp, tc, related] = await Promise.all([
    getTranslations('detail'),
    getTranslations('part'),
    getTranslations('common'),
    part.category ? getPartList(locale, { category: part.category.slug }, 5) : Promise.resolve(null),
  ]);

  const inStock = part.available_quantity > 0;
  const others = (related?.data ?? []).filter((p) => p.id !== part.id).slice(0, 4);
  const models = part.compatible_models ?? [];

  const rows: SpecRow[] = [
    { label: t('sku'), value: part.sku },
    ...(part.category ? [{ label: t('category'), value: part.category.name }] : []),
    ...(models.length > 0 ? [{ label: t('compatible'), value: new Intl.ListFormat(locale, { style: 'narrow', type: 'conjunction' }).format(models) }] : []),
  ];

  return (
    <main className="container-awm py-10">
      {/* Our breadcrumb trail below is localized and printed once; Laravel's English-only copy is skipped. */}
      {seo && <JsonLd data={seo.json_ld.filter((item) => item['@type'] !== 'BreadcrumbList')} />}
      <Breadcrumbs locale={locale} items={[{ label: t('backToParts'), href: '/parts' }, { label: part.name }]} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Gallery images={part.image ? [part.image] : []} alt={part.name} />

        <div className="flex flex-col gap-6 border-s-4 border-awm-red ps-6">
          {part.is_oem && <Tag tone="dark" className="w-fit">{t('oem')}</Tag>}
          <div>
            <h1 className="text-4xl font-extrabold leading-tight">{part.name}</h1>
            <p className="mt-2 font-mono text-sm text-awm-muted" dir="ltr">{tp('sku')}: {part.sku}</p>
          </div>

          <p className="font-mono text-3xl font-extrabold tabular-nums">{formatMoney(part.price, part.currency, locale, 2)}</p>
          <p className={`text-sm font-bold ${inStock ? 'text-awm-muted' : 'text-awm-red'}`}>
            {inStock ? t('available', { count: formatNumber(part.available_quantity, locale) }) : t('unavailable')}
          </p>

          <AddToCartButton
            disabled={!inStock}
            label={tc('addToCart')}
            inCartLabel={tc('inCart')}
            item={{
              type: 'spare_part',
              refId: part.id,
              sku: part.sku,
              name: part.name_i18n,
              image: part.image ?? undefined,
              unitPrice: Number(part.price),
              currency: part.currency,
              maxQuantity: part.available_quantity,
            }}
          />
        </div>
      </div>

      {part.description && (
        <section aria-labelledby="desc" className="mt-12 max-w-3xl">
          <h2 id="desc" className="mb-3 text-2xl font-extrabold">{t('description')}</h2>
          <p className="whitespace-pre-line text-base leading-8 text-awm-muted">{part.description}</p>
        </section>
      )}

      <section aria-labelledby="specs" className="mt-12">
        <h2 id="specs" className="mb-4 text-2xl font-extrabold">{t('specs')}</h2>
        <SpecList rows={rows} />
      </section>

      {others.length > 0 && (
        <section aria-labelledby="similar" className="mt-16">
          <h2 id="similar" className="mb-6 text-2xl font-extrabold">{t('similarParts')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((p) => <PartCard key={p.id} part={p} locale={locale} />)}
          </div>
        </section>
      )}
    </main>
  );
}
