import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { VehicleForm } from '@/components/admin/VehicleForm';
import { PageHeader } from '@/components/ui/primitives';
import { authedGet } from '@/lib/session';
import type { AdminVehicleFull } from '@/types/admin';

export default async function EditVehicle({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const t = await getTranslations('admin.vehicleForm');
  const vehicle = await authedGet<AdminVehicleFull>(`/admin/vehicles/${Number(id)}`, locale, `/${locale}/admin/vehicles/${id}`);
  if (!vehicle) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={t('eyebrow')} title={`${vehicle.name[locale] || vehicle.name.en} ${vehicle.model_year}`} />
      <VehicleForm vehicle={vehicle} />
    </div>
  );
}
