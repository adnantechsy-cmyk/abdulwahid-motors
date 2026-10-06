import { getTranslations } from 'next-intl/server';
import { VehicleForm } from '@/components/admin/VehicleForm';
import { PageHeader } from '@/components/ui/primitives';

export default async function NewVehicle() {
  const t = await getTranslations('admin.vehicleForm');
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={t('eyebrow')} title={t('newTitle')} />
      <VehicleForm />
    </div>
  );
}
