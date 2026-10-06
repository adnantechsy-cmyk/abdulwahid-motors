import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EmptyNote } from '@/components/account/Panel';
import { OwnedVehicleCard } from '@/components/account/VehicleCard';
import { accountGet } from '@/lib/api/account';
import type { OwnedVehicleListItem } from '@/types/account';

type Props = { params: Promise<{ locale: string }> };

export default async function VehiclesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, vehicles] = await Promise.all([getTranslations('account'), accountGet<OwnedVehicleListItem[]>('/account/vehicles', locale)]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">{t('vehicles.title')}</h1>
      {vehicles && vehicles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => <OwnedVehicleCard key={v.id} vehicle={v} locale={locale} as="h2" />)}
        </div>
      ) : (
        <EmptyNote>{t('empty.vehicles')}</EmptyNote>
      )}
    </div>
  );
}
