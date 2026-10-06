import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/Tag';
import { Link } from '@/i18n/navigation';
import { formatMoney } from '@/lib/format';
import type { VehicleDto } from '@/types/api';

export async function VehicleCard({ vehicle, locale, priority = false }: { vehicle: VehicleDto; locale: string; priority?: boolean }) {
  const t = await getTranslations('vehicle');
  const tc = await getTranslations('common');
  const available = vehicle.status === 'available';

  return (
    <article className="flex flex-col border border-awm-line bg-white">
      <Link href={`/vehicles/${vehicle.slug}`} className="group relative block aspect-[4/3] bg-awm-surface" aria-hidden="true" tabIndex={-1}>
        {vehicle.image ? (
          <Image
            src={vehicle.image}
            alt=""
            fill
            priority={priority}
            sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-awm-muted"><Icon name="car" size={56} /></span>
        )}
        <Tag tone={available ? 'dark' : 'red'} className="absolute start-3 top-3">{t(`status.${vehicle.status}`)}</Tag>
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <p className="text-xs font-bold text-awm-muted">{t(`powertrain.${vehicle.powertrain}`)} · {vehicle.model_year}</p>
          <h3 className="mt-1 text-xl font-extrabold leading-snug">
            <Link href={`/vehicles/${vehicle.slug}`} className="hover:text-awm-red">{vehicle.name}</Link>
          </h3>
          {vehicle.tagline && <p className="mt-1 text-sm text-awm-muted">{vehicle.tagline}</p>}
        </div>

        <dl className={`mt-auto grid gap-px bg-awm-line ${Number(vehicle.deposit_amount) > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="bg-awm-panel p-3">
            <dt className="text-xs text-awm-muted">{t('fullPrice')}</dt>
            <dd className="font-mono text-base font-bold tabular-nums">{vehicle.price !== null ? formatMoney(vehicle.price, vehicle.currency, locale) : <span className="font-sans text-sm">{tc('contactForPrice')}</span>}</dd>
          </div>
          {Number(vehicle.deposit_amount) > 0 && (
            <div className="bg-awm-panel p-3">
              <dt className="text-xs text-awm-muted">{t('deposit')}</dt>
              <dd className="font-mono text-base font-bold tabular-nums text-awm-red">{formatMoney(vehicle.deposit_amount, vehicle.currency, locale)}</dd>
            </div>
          )}
        </dl>

        <AddToCartButton
          disabled={!available}
          label={t('reserve')}
          inCartLabel={tc('inCart')}
          className="h-11 px-4 text-sm"
          item={{
            type: 'vehicle_reservation',
            refId: vehicle.id,
            name: vehicle.name_i18n,
            image: vehicle.image ?? undefined,
            unitPrice: Number(vehicle.deposit_amount), // the DEPOSIT
            vehiclePrice: Number(vehicle.price ?? 0),
            currency: vehicle.currency,
          }}
        />
      </div>
    </article>
  );
}
