import { getTranslations, setRequestLocale } from 'next-intl/server';
import { VehicleForm } from '@/components/admin/VehicleForm';
import { Panel } from '@/components/account/Panel';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import type { PartCategory } from '@/types/admin';

type Props = { params: Promise<{ locale: string }> };

export default async function NewVehiclePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'vehicles.manage');

  const [t, categories] = await Promise.all([getTranslations('admin.vehicles'), adminGet<PartCategory[]>('/admin/vehicle-categories', locale)]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/vehicles" className="text-sm font-bold text-awm-red underline underline-offset-4">{t('backToList')}</Link>
        <h1 className="mt-3 text-3xl font-extrabold">{t('newTitle')}</h1>
        <p className="mt-2 text-sm text-awm-muted">{t('newHint')}</p>
      </div>
      <Panel id="vehicle-form" title={t('details')}>
        <VehicleForm categories={categories ?? []} />
      </Panel>
    </div>
  );
}
