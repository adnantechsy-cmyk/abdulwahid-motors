import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { JsonLd } from '@/components/seo/JsonLd';
import { apiGet } from '@/lib/api/server';
import { toMetadata } from '@/lib/seo/buildMetadata';
import type { VehicleDto } from '@/types/api';
import type { SeoPayload } from '@/types/seo';

type Props = { params: Promise<{ locale: string; slug: string }> };

// Runs on the server. Meta tags come straight from Laravel's seo_metas (admin-editable).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const seo = await apiGet<SeoPayload>(`/seo/vehicles/${slug}`, { locale, tags: ['seo'] });
  return seo ? toMetadata(seo) : {};
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

  const t = await getTranslations('vehicle');
  const tc = await getTranslations('common');
  const money = (v: string) => new Intl.NumberFormat(locale, { style: 'currency', currency: vehicle.currency, maximumFractionDigits: 0 }).format(Number(v));

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {seo && <JsonLd data={seo.json_ld} />}

      <div className="grid gap-10 md:grid-cols-2">
        <div className="relative aspect-[4/3] bg-awm-surface">
          {vehicle.image && <Image src={vehicle.image} alt={vehicle.name} fill priority sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />}
        </div>

        <div className="flex flex-col gap-6 border-s-4 border-awm-red ps-6">
          <span className="w-fit bg-awm-black px-3 py-1 text-xs font-bold text-white">{t(`status.${vehicle.status}`)}</span>
          <h1 className="text-4xl font-extrabold leading-tight">{vehicle.name} <span className="text-awm-red">{vehicle.model_year}</span></h1>
          {vehicle.description && <p className="text-base leading-7 text-awm-black/70">{vehicle.description}</p>}

          <dl className="grid grid-cols-2 gap-px bg-awm-black/10">
            <div className="bg-white p-4"><dt className="text-xs text-awm-black/60">{t('fullPrice')}</dt><dd className="text-2xl font-extrabold">{money(vehicle.price)}</dd></div>
            <div className="bg-white p-4"><dt className="text-xs text-awm-black/60">{t('deposit')}</dt><dd className="text-2xl font-extrabold text-awm-red">{money(vehicle.deposit_amount)}</dd></div>
          </dl>

          <AddToCartButton
            disabled={vehicle.status !== 'available'}
            label={t('reserve')}
            inCartLabel={tc('inCart')}
            item={{
              type: 'vehicle_reservation',
              refId: vehicle.id,
              name: vehicle.name_i18n,
              image: vehicle.image ?? undefined,
              unitPrice: Number(vehicle.deposit_amount),   // the DEPOSIT
              vehiclePrice: Number(vehicle.price),
              currency: vehicle.currency,
            }}
          />
        </div>
      </div>
    </main>
  );
}
