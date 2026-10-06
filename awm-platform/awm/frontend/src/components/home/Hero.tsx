import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatMoney, formatNumber } from '@/lib/format';
import type { VehicleDto } from '@/types/api';

const SPEC_KEYS = ['range_km', 'battery_kwh', 'seats'] as const;

/** Hero headline + the featured car from the API. Without a car it falls back to text only. */
export async function Hero({ vehicle, locale }: { vehicle?: VehicleDto; locale: string }) {
  const t = await getTranslations('home.hero');
  const tv = await getTranslations('vehicle');

  // Only specs the car actually has: never invent numbers.
  const specs = vehicle
    ? SPEC_KEYS.flatMap((key) => {
        const raw = vehicle.specs?.[key];
        if (raw === undefined || raw === null || raw === '') return [];
        const value = formatNumber(Number(raw), locale);
        const unit = key === 'range_km' ? ` ${tv('unit.km')}` : key === 'battery_kwh' ? ` ${tv('unit.kwh')}` : '';
        return [{ key, label: tv(`spec.${key}`), value: `${value}${unit}` }];
      })
    : [];

  return (
    <section aria-labelledby="hero-title" className="border-b border-awm-line">
      <div className="container-awm grid grid-cols-1 items-stretch gap-8 py-10 lg:grid-cols-2 lg:py-16">
        <div className="flex flex-col justify-center gap-6 border-s-4 border-awm-red ps-6">
          <p className="text-sm font-bold text-awm-red">{t('eyebrow')}</p>
          <h1 id="hero-title" className="text-4xl font-extrabold leading-tight sm:text-5xl">{t('title')}</h1>
          <p className="max-w-xl text-base leading-7 text-awm-muted">{t('description')}</p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/vehicles" size="lg">{t('ctaVehicles')}<Icon name="arrow" /></ButtonLink>
            <ButtonLink href="/service-booking" variant="outline" size="lg">{t('ctaTestDrive')}</ButtonLink>
          </div>
        </div>

        {vehicle && (
          <div className="flex flex-col border border-awm-line bg-white">
            <div className="relative aspect-[16/10] bg-awm-surface">
              {vehicle.image ? (
                <Image src={vehicle.image} alt={vehicle.name} fill priority sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-awm-muted"><Icon name="car" size={72} /></span>
              )}
              <span className="absolute start-0 top-0 bg-awm-black px-3 py-1 text-xs font-bold text-white">{t('featured')}</span>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4 p-5">
              <div>
                <p className="text-lg font-extrabold">{vehicle.name} <span className="text-awm-red">{vehicle.model_year}</span></p>
                <p className="mt-1 font-mono text-sm tabular-nums text-awm-muted">{t('priceFrom')}: {formatMoney(vehicle.price, vehicle.currency, locale)}</p>
              </div>
              <ButtonLink href={`/vehicles/${vehicle.slug}`} variant="dark" size="sm">{t('view')}</ButtonLink>
            </div>

            {specs.length > 0 && (
              <dl className="grid auto-cols-fr grid-flow-col gap-px border-t border-awm-line bg-awm-line">
                {specs.map((s) => (
                  <div key={s.key} className="bg-awm-panel p-4">
                    <dt className="text-xs text-awm-muted">{s.label}</dt>
                    <dd className="mt-1 font-mono text-lg font-bold tabular-nums">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
