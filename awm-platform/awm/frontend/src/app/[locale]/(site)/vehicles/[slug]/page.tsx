import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs';
import { Gallery } from '@/components/catalog/Gallery';
import { SpecList, type SpecRow } from '@/components/catalog/SpecList';
import { VehicleCard } from '@/components/catalog/VehicleCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { ButtonLink } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { apiGet } from '@/lib/api/server';
import { getVehicleList } from '@/lib/api/catalog';
import { formatMoney, formatYear } from '@/lib/format';
import { toMetadata } from '@/lib/seo/buildMetadata';
import { formatSpecValue, humanizeKey, unitFor } from '@/lib/specs';
import type { VehicleDto } from '@/types/api';
import type { SeoPayload } from '@/types/seo';

type Props = { params: Promise<{ locale: string; slug: string }> };

// Runs on the server. Meta tags come straight from Laravel's seo_metas (admin-editable).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const seo = await apiGet<SeoPayload>(`/seo/vehicles/${slug}`, { locale, tags: ['seo'] });
  return seo ? toMetadata(seo, locale) : {};
}

export default async function VehiclePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // Same URLs as generateMetadata for SEO; fetch() dedupes identical requests per render.
  const [vehicle, seo] = await Promise.all([
    apiGet<VehicleDto>(`/vehicles/${slug}`, { locale, tags: ['vehicles'] }),
    apiGet<SeoPayload>(`/seo/vehicles/${slug}`, { locale, tags: ['seo'] }),
  ]);
  if (!vehicle) notFound();

  const [t, tv, td, similar] = await Promise.all([
    getTranslations('detail'),
    getTranslations('vehicle'),
    getTranslations('common'),
    getVehicleList(locale, {}, 5),
  ]);

  const money = (v: string) => formatMoney(v, vehicle.currency, locale);
  const available = vehicle.status === 'available';
  const images = [...new Set([vehicle.image, ...vehicle.gallery].filter((src): src is string => Boolean(src)))];
  const others = (similar?.data ?? []).filter((v) => v.id !== vehicle.id).slice(0, 4);

  const unitLabel = (key: string) => {
    const unit = unitFor(key);
    return unit ? t(`units.${unit}`) : undefined;
  };
  const rows: SpecRow[] = [
    { label: t('modelYear'), value: formatYear(vehicle.model_year, locale) },
    ...(vehicle.body_type ? [{ label: t('bodyType'), value: t.has(`bodyTypes.${vehicle.body_type}`) ? t(`bodyTypes.${vehicle.body_type}`) : vehicle.body_type }] : []),
    { label: t('powertrain'), value: tv(`powertrain.${vehicle.powertrain}`) },
    ...Object.entries(vehicle.specs ?? {}).map(([key, value]) => ({
      label: t.has(`specNames.${key}`) ? t(`specNames.${key}`) : humanizeKey(key),
      value: formatSpecValue(value, locale, unitLabel(key)),
    })),
  ];

  return (
    <main className="container-awm py-10">
      {/* Our breadcrumb trail below is localized and printed once; Laravel's English-only copy is skipped. */}
      {seo && <JsonLd data={seo.json_ld.filter((item) => item['@type'] !== 'BreadcrumbList')} />}
      <Breadcrumbs locale={locale} items={[{ label: t('backToCars'), href: '/vehicles' }, { label: vehicle.name }]} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Gallery images={images} alt={vehicle.name} />

        <div className="flex flex-col gap-6 border-s-4 border-awm-red ps-6">
          <Tag tone={available ? 'dark' : 'red'} className="w-fit">{tv(`status.${vehicle.status}`)}</Tag>
          <div>
            <h1 className="text-4xl font-extrabold leading-tight">{vehicle.name} <span className="text-awm-red">{vehicle.model_year}</span></h1>
            {vehicle.tagline && <p className="mt-2 text-lg text-awm-muted">{vehicle.tagline}</p>}
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <div className="border border-awm-line bg-white p-4"><dt className="text-xs text-awm-muted">{tv('fullPrice')}</dt><dd className="mt-1 font-mono text-2xl font-extrabold tabular-nums">{money(vehicle.price)}</dd></div>
            <div className="border border-awm-line bg-white p-4"><dt className="text-xs text-awm-muted">{tv('deposit')}</dt><dd className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-awm-red">{money(vehicle.deposit_amount)}</dd></div>
          </dl>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <AddToCartButton
                disabled={!available}
                label={tv('reserve')}
                inCartLabel={td('inCart')}
                className="h-14 w-full px-8 text-base"
                item={{
                  type: 'vehicle_reservation',
                  refId: vehicle.id,
                  name: vehicle.name_i18n,
                  image: vehicle.image ?? undefined,
                  unitPrice: Number(vehicle.deposit_amount), // the DEPOSIT
                  vehiclePrice: Number(vehicle.price),
                  currency: vehicle.currency,
                }}
              />
            </div>
            <ButtonLink href="/service-booking" variant="outline" size="lg">{t('bookTestDrive')}</ButtonLink>
          </div>
        </div>
      </div>

      {vehicle.description && (
        <section aria-labelledby="desc" className="mt-12 max-w-3xl">
          <h2 id="desc" className="mb-3 text-2xl font-extrabold">{t('description')}</h2>
          <p className="whitespace-pre-line text-base leading-8 text-awm-muted">{vehicle.description}</p>
        </section>
      )}

      <section aria-labelledby="specs" className="mt-12">
        <h2 id="specs" className="mb-4 text-2xl font-extrabold">{t('specs')}</h2>
        <SpecList rows={rows} />
      </section>

      {others.length > 0 && (
        <section aria-labelledby="similar" className="mt-16">
          <h2 id="similar" className="mb-6 text-2xl font-extrabold">{t('similarCars')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((v) => <VehicleCard key={v.id} vehicle={v} locale={locale} />)}
          </div>
        </section>
      )}
    </main>
  );
}
